import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { subdomain: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { users: true, branches: true },
          },
          subscriptions: {
            where: {
              status: { in: ['ACTIVE', 'TRIAL'] },
              endDate: { gte: new Date() },
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              plan: { select: { id: true, nameAr: true, nameEn: true } },
            },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        email: t.email,
        phone: t.phone,
        address: t.address,
        logoUrl: t.logoUrl,
        isActive: t.isActive,
        branding: t.branding,
        maxBranches: t.maxBranches,
        maxCashiers: t.maxCashiers,
        maxProducts: t.maxProducts,
        maxInvoicesPerMonth: t.maxInvoicesPerMonth,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        usersCount: t._count.users,
        branchesCount: t._count.branches,
        activeSubscription: t.subscriptions[0] || null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, branches: true, products: true },
        },
        subscriptions: {
          where: {
            status: { in: ['ACTIVE', 'TRIAL'] },
            endDate: { gte: new Date() },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            plan: { select: { id: true, nameAr: true, nameEn: true, durationDays: true, price: true } },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      logoUrl: tenant.logoUrl,
      isActive: tenant.isActive,
      branding: tenant.branding,
      settings: tenant.settings,
      maxBranches: tenant.maxBranches,
      maxCashiers: tenant.maxCashiers,
      maxProducts: tenant.maxProducts,
      maxInvoicesPerMonth: tenant.maxInvoicesPerMonth,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      usersCount: tenant._count.users,
      branchesCount: tenant._count.branches,
      productsCount: tenant._count.products,
      activeSubscription: tenant.subscriptions[0] || null,
    };
  }

  async create(dto: CreateTenantDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain: dto.subdomain },
    });

    if (existingTenant) {
      throw new ConflictException('Subdomain is already taken');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.tenant.findFirst({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email is already associated with another tenant');
      }
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        subdomain: dto.subdomain,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        branding: JSON.stringify({
          primaryColor: '#1a73e8',
          secondaryColor: '#ffffff',
          textColor: '#333333',
          backgroundColor: '#f5f5f5',
        }),
        settings: JSON.stringify({
          language: 'ar',
          currency: 'SAR',
          timezone: 'Asia/Riyadh',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
        }),
      },
    });

    this.logger.log(`Tenant created: ${tenant.name} (${tenant.subdomain})`);

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      email: tenant.email,
      createdAt: tenant.createdAt,
    };
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (dto.email && dto.email !== tenant.email) {
      const existingEmail = await this.prisma.tenant.findFirst({
        where: { email: dto.email, id: { not: id } },
      });
      if (existingEmail) {
        throw new ConflictException('Email is already associated with another tenant');
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
      },
    });

    this.logger.log(`Tenant updated: ${updated.name}`);

    return {
      id: updated.id,
      name: updated.name,
      subdomain: updated.subdomain,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.tenant.delete({ where: { id } });

    this.logger.log(`Tenant deleted (soft): ${tenant.name}`);

    return { message: 'Tenant deleted successfully' };
  }

  async toggleActive(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });

    if (!updated.isActive) {
      await this.prisma.refreshToken.updateMany({
        where: {
          user: { tenantId: id },
          isRevoked: false,
        },
        data: { isRevoked: true },
      });
    }

    this.logger.log(`Tenant ${updated.isActive ? 'activated' : 'deactivated'}: ${updated.name}`);

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: `Tenant ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async updateBranding(id: string, dto: UpdateTenantBrandingDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let existingBranding: Record<string, unknown> = {};
    if (typeof tenant.branding === 'string') {
      try {
        existingBranding = JSON.parse(tenant.branding) as Record<string, unknown>;
      } catch {
        existingBranding = {};
      }
    }

    const branding = {
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : existingBranding.logoUrl,
      primaryColor: dto.primaryColor !== undefined ? dto.primaryColor : existingBranding.primaryColor,
      secondaryColor: dto.secondaryColor !== undefined ? dto.secondaryColor : existingBranding.secondaryColor,
      textColor: dto.textColor !== undefined ? dto.textColor : existingBranding.textColor,
      backgroundColor: dto.backgroundColor !== undefined ? dto.backgroundColor : existingBranding.backgroundColor,
      faviconUrl: dto.faviconUrl !== undefined ? dto.faviconUrl : existingBranding.faviconUrl,
      displayName: dto.displayName !== undefined ? dto.displayName : existingBranding.displayName,
    };

    await this.prisma.tenant.update({
      where: { id },
      data: {
        branding: JSON.stringify(branding),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });

    this.logger.log(`Branding updated for tenant: ${tenant.name}`);

    return {
      id,
      branding,
      message: 'Branding updated successfully',
    };
  }

  async updateSettings(id: string, settings: Record<string, unknown>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let existingSettings: Record<string, unknown> = {};
    if (typeof tenant.settings === 'string') {
      try {
        existingSettings = JSON.parse(tenant.settings) as Record<string, unknown>;
      } catch {
        existingSettings = {};
      }
    }
    const mergedSettings = { ...existingSettings, ...settings };

    await this.prisma.tenant.update({
      where: { id },
      data: { settings: JSON.stringify(mergedSettings) },
    });

    this.logger.log(`Settings updated for tenant: ${tenant.name}`);

    return {
      id,
      settings: mergedSettings,
      message: 'Settings updated successfully',
    };
  }

  async getSubscriptions(tenantId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: { id: true, nameAr: true, nameEn: true, durationDays: true, price: true },
        },
      },
    });

    return { data: subscriptions };
  }
}