import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth.types';
import { Socket } from 'socket.io';

interface HandshakeSocket extends Socket {
  handshake: Socket['handshake'] & {
    auth?: { token?: string };
    query?: { token?: string };
  };
}

@Injectable()
export class WsJwtStrategy extends PassportStrategy(Strategy, 'ws-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: unknown) => {
          const client = request as HandshakeSocket;
          const token =
            client?.handshake?.auth?.token ||
            client?.handshake?.query?.token ||
            null;
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.accessSecret', 'super-secret-key-change-in-production'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is deactivated');
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: { gte: new Date() },
      },
    });

    if (!activeSubscription) {
      throw new UnauthorizedException('No active subscription');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId ?? undefined,
      name: user.name,
    };
  }
}