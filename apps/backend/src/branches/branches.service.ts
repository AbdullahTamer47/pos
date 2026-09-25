import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    tenantId: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where: { tenantId: query.tenantId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { users: true, warehouses: true },
          },
        },
      }),
      this.prisma.branch.count({
        where: { tenantId: query.tenantId },
      }),
    ]);

    return {
      data: branches.map((b) => ({
        id: b.id,
        nameAr: b.nameAr,
        nameEn: b.nameEn,
        code: b.code,
        address: b.address,
        phone: b.phone,
        email: b.email,
        isActive: b.isActive,
        isMain: b.isMain,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        usersCount: b._count.users,
        warehousesCount: b._count.warehouses,
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
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { users: true, warehouses: true },
        },
        warehouses: {
          select: { id: true, nameAr: true, nameEn: true, code: true, isDefault: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return {
      id: branch.id,
      nameAr: branch.nameAr,
      nameEn: branch.nameEn,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      isMain: branch.isMain,
      location: branch.location,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      usersCount: branch._count.users,
      warehousesCount: branch._count.warehouses,
      warehouses: branch.warehouses,
    };
  }

  async create(dto: CreateBranchDto, tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: { select: { branches: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.isActive) {
      throw new ForbiddenException('Tenant is deactivated');
    }

    if (tenant._count.branches >= tenant.maxBranches) {
      throw new ForbiddenException(
        `Tenant has reached the maximum number of branches (${tenant.maxBranches}). Upgrade your plan to add more branches.`,
      );
    }

    const existingByCode = await this.prisma.branch.findFirst({
      where: { code: dto.code, tenantId },
    });

    if (existingByCode) {
      throw new ConflictException('Branch code already exists in this tenant');
    }

    if (dto.isMain) {
      const existingMain = await this.prisma.branch.findFirst({
        where: { isMain: true, tenantId },
      });

      if (existingMain) {
        await this.prisma.branch.update({
          where: { id: existingMain.id },
          data: { isMain: false },
        });
      }
    }

    const branch = await this.prisma.branch.create({
      data: {
        tenantId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        isMain: dto.isMain || false,
      },
    });

    this.logger.log(`Branch created: ${branch.nameEn} in tenant ${tenantId}`);

    return {
      id: branch.id,
      nameAr: branch.nameAr,
      nameEn: branch.nameEn,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isMain: branch.isMain,
      createdAt: branch.createdAt,
    };
  }

  async update(id: string, dto: UpdateBranchDto, tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (dto.code && dto.code !== branch.code) {
      const existingByCode = await this.prisma.branch.findFirst({
        where: { code: dto.code, tenantId, id: { not: id } },
      });
      if (existingByCode) {
        throw new ConflictException('Branch code already exists in this tenant');
      }
    }

    if (dto.isMain && !branch.isMain) {
      const existingMain = await this.prisma.branch.findFirst({
        where: { isMain: true, tenantId, id: { not: id } },
      });

      if (existingMain) {
        await this.prisma.branch.update({
          where: { id: existingMain.id },
          data: { isMain: false },
        });
      }
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isMain !== undefined && { isMain: dto.isMain }),
      },
    });

    this.logger.log(`Branch updated: ${updated.nameEn}`);

    return {
      id: updated.id,
      nameAr: updated.nameAr,
      nameEn: updated.nameEn,
      code: updated.code,
      address: updated.address,
      phone: updated.phone,
      email: updated.email,
      isMain: updated.isMain,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(id: string, tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const usersCount = await this.prisma.user.count({
      where: { branchId: id },
    });

    if (usersCount > 0) {
      throw new BadRequestException(
        `Cannot delete branch with ${usersCount} assigned users. Reassign users first.`,
      );
    }

    await this.prisma.branch.delete({ where: { id } });

    this.logger.log(`Branch deleted (soft): ${branch.nameEn}`);

    return { message: 'Branch deleted successfully' };
  }

  async toggleActive(id: string, tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: { isActive: !branch.isActive },
    });

    this.logger.log(`Branch ${updated.isActive ? 'activated' : 'deactivated'}: ${updated.nameEn}`);

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: `Branch ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }
}