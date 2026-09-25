import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.accessSecret', 'super-secret-key-change-in-production'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<JwtPayload> {
    const authHeader = req.headers.authorization;
    const accessToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : '';

    if (accessToken) {
      const tokenHash = createHash('sha256').update(accessToken).digest('hex');
      const blocked = await this.redisService.exists(
        `blacklist:at:${tokenHash}`,
      );
      if (blocked) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    if (payload.role === 'SUPER_ADMIN' || payload.tenantId === 'system') {
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { id: payload.sub },
      });
      if (!superAdmin) {
        throw new UnauthorizedException('Super admin not found');
      }
      return {
        sub: superAdmin.id,
        email: superAdmin.email,
        role: 'SUPER_ADMIN',
        tenantId: 'system',
        name: superAdmin.name,
      };
    }

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