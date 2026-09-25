import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateCashierPermissionsDto } from './dto/update-cashier-permissions.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    role?: string;
    branchId?: string;
    tenantId: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: Record<string, unknown> = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.branchId) {
      where.branchId = query.branchId;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          ...where,
          tenantId: query.tenantId,
        } as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          branch: {
            select: { id: true, nameAr: true, nameEn: true, code: true },
          },
          cashierProfile: {
            select: { id: true, isOnShift: true, permissions: true },
          },
        },
      }),
      this.prisma.user.count({
        where: { ...where, tenantId: query.tenantId } as any,
      }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        branchId: u.branchId,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        branch: u.branch,
        cashierProfile: u.cashierProfile,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: {
        branch: {
          select: { id: true, nameAr: true, nameEn: true, code: true },
        },
        cashierProfile: {
          select: { id: true, isOnShift: true, shiftId: true, permissions: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      branchId: user.branchId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      branch: user.branch,
      cashierProfile: user.cashierProfile,
    };
  }

  async create(dto: CreateUserDto, tenantId: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists in this tenant');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { users: true } } },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.isActive) {
      throw new ForbiddenException('Tenant is deactivated');
    }

    if (tenant._count.users >= tenant.maxCashiers) {
      throw new ForbiddenException('Tenant has reached the maximum number of users');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found in this tenant');
      }
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

    this.logger.log(`User created: ${user.email} in tenant ${tenantId}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
    };
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const duplicate = await this.prisma.user.findFirst({
        where: { email: dto.email, tenantId, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('Email already in use by another user');
      }
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found in this tenant');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    if (dto.role === 'CASHIER' && user.role !== 'CASHIER') {
      await this.prisma.cashierProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
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
        update: {},
      });
    }

    this.logger.log(`User updated: ${updated.email}`);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      branchId: updated.branchId,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    this.logger.log(`User deleted (soft): ${user.email}`);

    return { message: 'User deleted successfully' };
  }

  async updatePermissions(
    userId: string,
    dto: UpdateCashierPermissionsDto,
    tenantId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'CASHIER') {
      throw new BadRequestException('Permissions can only be updated for cashier users');
    }

    const permissions = {
      CREATE_SALE: dto.CREATE_SALE,
      PROCESS_REFUND: dto.PROCESS_REFUND,
      APPLY_DISCOUNT: dto.APPLY_DISCOUNT,
      VIEW_REPORTS: dto.VIEW_REPORTS,
      MANAGE_CUSTOMERS: dto.MANAGE_CUSTOMERS,
      MANAGE_INVENTORY: dto.MANAGE_INVENTORY,
      HOLD_ORDER: dto.HOLD_ORDER,
      SPLIT_PAYMENT: dto.SPLIT_PAYMENT,
      VOID_TRANSACTION: dto.VOID_TRANSACTION,
      OPEN_DRAWER: dto.OPEN_DRAWER,
    };

    await this.prisma.cashierProfile.upsert({
      where: { userId },
      create: {
        userId,
        permissions: JSON.stringify(permissions),
      },
      update: {
        permissions: JSON.stringify(permissions),
      },
    });

    this.logger.log(`Permissions updated for cashier: ${user.email}`);

    return {
      userId,
      permissions,
      message: 'Permissions updated successfully',
    };
  }

  async toggleActive(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    if (!updated.isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    this.logger.log(`User ${updated.isActive ? 'activated' : 'deactivated'}: ${updated.email}`);

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async assignBranch(id: string, branchId: string | null, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found in this tenant');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { branchId },
    });

    this.logger.log(`User ${updated.email} assigned to branch: ${branchId || 'none'}`);

    return {
      id: updated.id,
      branchId: updated.branchId,
      message: 'Branch assigned successfully',
    };
  }
}