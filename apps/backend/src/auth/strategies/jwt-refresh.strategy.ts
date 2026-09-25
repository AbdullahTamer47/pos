import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth.types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const body = request.body as { refreshToken?: string };
          return body?.refreshToken || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.refreshSecret', 'super-refresh-secret-change-in-production'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<{ user: JwtPayload; token: string }> {
    const body = request.body as { refreshToken?: string };
    const token = body?.refreshToken || '';

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { tenant: true } } },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    if (!storedToken.user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is deactivated');
    }

    return {
      user: {
        sub: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
        tenantId: storedToken.user.tenantId,
        branchId: storedToken.user.branchId ?? undefined,
        name: storedToken.user.name,
      },
      token,
    };
  }
}