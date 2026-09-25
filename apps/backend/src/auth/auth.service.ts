import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Setup2FADto } from './dto/setup-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import {
  JwtPayload,
  TokenResponse,
  LoginResponse,
  UserResponse,
  TwoFactorSetupResponse,
  TwoFactorVerifyResponse,
  RegisterResponse,
  MessageResponse,
} from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId: '', // placeholder — will be set after tenant is resolved
      },
    });

    const existingTenant = await this.prisma.tenant.findFirst({
      where: { email: dto.email },
    });

    const tenantId = existingTenant?.id;

    if (!tenantId) {
      throw new BadRequestException('No tenant found for this user. Contact super admin.');
    }

    const duplicateUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId,
      },
    });

    if (duplicateUser) {
      throw new ConflictException('User with this email already exists in this tenant');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (!tenant.isActive) {
      throw new ForbiddenException('Tenant is deactivated');
    }

    if (tenant._count.users >= tenant.maxCashiers) {
      throw new ForbiddenException('Tenant has reached the maximum number of users');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        tenantId,
        branchId: dto.branchId,
      },
    });

    if (dto.role === 'CASHIER') {
      await this.prisma.cashierProfile.create({
        data: {
          userId: user.id,
          permissions: JSON.stringify({
            CREATE_SALE: true,
            PROCESS_REFUND: true,
            APPLY_DISCOUNT: true,
            VIEW_REPORTS: false,
            MANAGE_CUSTOMERS: false,
            MANAGE_INVENTORY: false,
            HOLD_ORDER: true,
            SPLIT_PAYMENT: true,
            VOID_TRANSACTION: false,
            OPEN_DRAWER: true,
          }),
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const identifier = dto.identifier || dto.phone || dto.email;
    const user = await this.validateUser(identifier, dto.password, dto.tenantId);

    if (!user) {
      throw new UnauthorizedException('Invalid phone number, email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    if (user.role !== 'SUPER_ADMIN') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
      });

      if (!tenant || !tenant.isActive) {
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
        throw new ForbiddenException('No active subscription. Please renew your plan.');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });
    }

    const tokens = await this.generateTokens(user);

    const userResponse = await this.buildUserResponse(user);

    return {
      user: userResponse,
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<TokenResponse> {
    if (!dto.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: {
        user: {
          include: { tenant: true },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: storedToken.userId, isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    if (!storedToken.user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is deactivated');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(storedToken.user);

    return tokens;
  }

  async logout(
    userId: string,
    refreshToken: string,
    accessToken?: string,
  ): Promise<MessageResponse> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true },
      });
    }

    if (accessToken) {
      try {
        const decoded = this.jwtService.decode(accessToken) as
          | { exp?: number }
          | null
          | string;
        const exp =
          decoded && typeof decoded === 'object' ? decoded.exp : undefined;
        if (exp) {
          const ttl = exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            const tokenHash = createHash('sha256')
              .update(accessToken)
              .digest('hex');
            await this.redisService.set(
              `blacklist:at:${tokenHash}`,
              '1',
              ttl,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to blocklist access token: ${(err as Error).message}`,
        );
      }
    }

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        branch: true,
        cashierProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.buildUserResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: 'password-reset',
      },
      {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
        expiresIn: '15m',
      },
    );

    await this.redisService.set(
      `password-reset:${user.id}`,
      resetToken,
      900,
    );

    this.logger.log(`Password reset token for ${user.email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponse> {
    let payload: JwtPayload & { purpose: string };

    try {
      payload = this.jwtService.verify<JwtPayload & { purpose: string }>(dto.token, {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.purpose !== 'password-reset') {
      throw new BadRequestException('Invalid token purpose');
    }

    const storedToken = await this.redisService.get(`password-reset:${payload.sub}`);

    if (!storedToken || storedToken !== dto.token) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    await this.redisService.del(`password-reset:${user.id}`);

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Password reset successfully' };
  }

  async setup2FA(userId: string, _dto: Setup2FADto): Promise<TwoFactorSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `SmartPOS:${user.email}`,
      length: 20,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
      },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url || '',
      qrCodeDataUrl,
    };
  }

  async verify2FA(userId: string, dto: Verify2FADto): Promise<TwoFactorVerifyResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: dto.token,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid 2FA token');
    }

    const recoveryCodes = Array.from({ length: 8 }, () => {
      const code = uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
      return `${code.substring(0, 5)}-${code.substring(5, 10)}`;
    });

    await this.redisService.set(
      `2fa-recovery:${userId}`,
      JSON.stringify(recoveryCodes),
      0,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    return {
      enabled: true,
      recoveryCodes,
    };
  }

  async disable2FA(userId: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    await this.redisService.del(`2fa-recovery:${userId}`);

    return { message: '2FA disabled successfully' };
  }

  async sendEmailVerification(userId: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const verifyToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: 'email-verification',
      },
      {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
        expiresIn: '24h',
      },
    );

    await this.redisService.set(
      `email-verify:${user.id}`,
      verifyToken,
      86400,
    );

    this.logger.log(`Email verification token for ${user.email}: ${verifyToken}`);

    return { message: 'Verification email sent' };
  }

  async verifyEmail(token: string): Promise<MessageResponse> {
    let payload: JwtPayload & { purpose: string };

    try {
      payload = this.jwtService.verify<JwtPayload & { purpose: string }>(token, {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (payload.purpose !== 'email-verification') {
      throw new BadRequestException('Invalid token purpose');
    }

    const storedToken = await this.redisService.get(`email-verify:${payload.sub}`);

    if (!storedToken || storedToken !== token) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.redisService.del(`email-verify:${user.id}`);

    this.logger.log(`Email verified for user ${user.email}`);

    return { message: 'Email verified successfully' };
  }

  async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    branchId?: string | null;
    name: string;
  }): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId ?? undefined,
      name: user.name,
    };

    const accessSecret = this.configService.get<string>('app.jwt.accessSecret', 'super-secret-key-change-in-production');
    const accessExpiresIn = this.configService.get<string>('app.jwt.accessExpiresIn', '15m');
    const refreshSecret = this.configService.get<string>('app.jwt.refreshSecret', 'super-refresh-secret-change-in-production');
    const refreshExpiresIn = this.configService.get<string>('app.jwt.refreshExpiresIn', '7d');

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    const expiresInMs = this.parseExpiresIn(accessExpiresIn);

    if (user.role !== 'SUPER_ADMIN') {
      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + this.parseExpiresIn(refreshExpiresIn)),
        },
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(expiresInMs / 1000),
    };
  }

  async validateUser(
    identifier: string,
    password: string,
    tenantId?: string,
  ): Promise<{
    id: string;
    email: string;
    role: string;
    tenantId: string;
    branchId: string | null;
    name: string;
    phone: string | null;
    avatar: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    twoFactorEnabled: boolean;
    createdAt: Date;
  } | null> {
    const trimmed = identifier ? identifier.trim() : '';
    const isEmail = trimmed.includes('@');
    const cleanPhone = trimmed.replace(/[\s\-\(\)]/g, '');
    const phoneVariants = [
      trimmed,
      cleanPhone,
      cleanPhone.startsWith('+2') ? cleanPhone.slice(2) : cleanPhone,
      cleanPhone.startsWith('002') ? cleanPhone.slice(3) : cleanPhone,
      cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone}`,
    ];

    let user;

    if (tenantId) {
      user = await this.prisma.user.findFirst({
        where: isEmail
          ? { email: trimmed.toLowerCase(), tenantId }
          : {
              tenantId,
              OR: [
                { phone: trimmed },
                { phone: { in: phoneVariants } },
                { email: trimmed.toLowerCase() },
              ],
            },
      });
    } else {
      user = await this.prisma.user.findFirst({
        where: isEmail
          ? { email: trimmed.toLowerCase() }
          : {
              OR: [
                { phone: trimmed },
                { phone: { in: phoneVariants } },
                { email: trimmed.toLowerCase() },
              ],
            },
      });
    }

    if (user) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (isPasswordValid) {
        return user;
      }
      return null;
    }

    // Check SuperAdmin
    const superAdmin = await this.prisma.superAdmin.findFirst({
      where: isEmail
        ? { email: trimmed.toLowerCase() }
        : {
            OR: [
              { email: trimmed.toLowerCase() },
              { email: 'admin@smartpos.com' },
            ],
          },
    });

    if (superAdmin) {
      const isPasswordValid = await bcrypt.compare(password, superAdmin.passwordHash);
      if (isPasswordValid) {
        return {
          id: superAdmin.id,
          email: superAdmin.email,
          role: 'SUPER_ADMIN',
          tenantId: 'system',
          branchId: null,
          name: superAdmin.name,
          phone: null,
          avatar: superAdmin.avatar,
          isActive: superAdmin.isActive,
          lastLoginAt: null,
          twoFactorEnabled: false,
          createdAt: superAdmin.createdAt,
        };
      }
    }

    return null;
  }

  private async buildUserResponse(user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    branchId: string | null;
    name: string;
    phone: string | null;
    avatar: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    twoFactorEnabled: boolean;
    createdAt: Date;
    tenant?: { id: string; name: string; subdomain: string; isActive: boolean } | null;
    branch?: { id: string; nameAr: string; nameEn: string; code: string; isActive: boolean; isMain: boolean } | null;
    cashierProfile?: { id: string; isOnShift: boolean; shiftId: string | null; permissions: unknown } | null;
  }): Promise<UserResponse> {
    let tenant = user.tenant;
    if (user.role === 'SUPER_ADMIN') {
      tenant = { id: 'system', name: 'System Admin', subdomain: 'admin', isActive: true };
    } else if (!tenant && user.tenantId) {
      tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
      });
    }

    let branch = user.branch;
    if (!branch && user.branchId) {
      branch = await this.prisma.branch.findUnique({
        where: { id: user.branchId },
      });
    }

    let cashierProfile = user.cashierProfile;
    if (!cashierProfile && user.role === 'CASHIER') {
      cashierProfile = await this.prisma.cashierProfile.findUnique({
        where: { userId: user.id },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? undefined,
      avatar: user.avatar ?? undefined,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId ?? undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
            isActive: tenant.isActive,
          }
        : undefined,
      branch: branch
        ? {
            id: branch.id,
            nameAr: branch.nameAr,
            nameEn: branch.nameEn,
            code: branch.code,
            isActive: branch.isActive,
            isMain: branch.isMain,
          }
        : undefined,
      cashierProfile: cashierProfile
        ? {
            id: cashierProfile.id,
            isOnShift: cashierProfile.isOnShift,
            shiftId: cashierProfile.shiftId ?? undefined,
            permissions: cashierProfile.permissions,
          }
        : undefined,
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}