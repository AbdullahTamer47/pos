import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    branchId?: string;
    tenantId: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: Record<string, unknown> = { tenantId: query.tenantId };
    if (query.branchId) {
      where.branchId = query.branchId;
    }

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          branch: {
            select: { id: true, nameAr: true, nameEn: true, code: true },
          },
          _count: {
            select: { stockLevels: true },
          },
        },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      data: warehouses.map((w) => ({
        id: w.id,
        nameAr: w.nameAr,
        nameEn: w.nameEn,
        code: w.code,
        branchId: w.branchId,
        isActive: w.isActive,
        isDefault: w.isDefault,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        branch: w.branch,
        stockLevelsCount: w._count.stockLevels,
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
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        branch: {
          select: { id: true, nameAr: true, nameEn: true, code: true },
        },
        _count: {
          select: { stockLevels: true },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return {
      id: warehouse.id,
      nameAr: warehouse.nameAr,
      nameEn: warehouse.nameEn,
      code: warehouse.code,
      branchId: warehouse.branchId,
      isActive: warehouse.isActive,
      isDefault: warehouse.isDefault,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
      branch: warehouse.branch,
      stockLevelsCount: warehouse._count.stockLevels,
    };
  }

  async create(dto: CreateWarehouseDto, tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found in this tenant');
    }

    if (!branch.isActive) {
      throw new BadRequestException('Branch is not active');
    }

    const existingByCode = await this.prisma.warehouse.findFirst({
      where: { code: dto.code, tenantId },
    });

    if (existingByCode) {
      throw new ConflictException('Warehouse code already exists in this tenant');
    }

    if (dto.isDefault) {
      const existingDefault = await this.prisma.warehouse.findFirst({
        where: { isDefault: true, tenantId, branchId: dto.branchId },
      });

      if (existingDefault) {
        await this.prisma.warehouse.update({
          where: { id: existingDefault.id },
          data: { isDefault: false },
        });
      }
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        code: dto.code,
        isDefault: dto.isDefault || false,
      },
      include: {
        branch: {
          select: { id: true, nameAr: true, nameEn: true, code: true },
        },
      },
    });

    this.logger.log(`Warehouse created: ${warehouse.nameEn} in tenant ${tenantId}`);

    return {
      id: warehouse.id,
      nameAr: warehouse.nameAr,
      nameEn: warehouse.nameEn,
      code: warehouse.code,
      branchId: warehouse.branchId,
      isDefault: warehouse.isDefault,
      createdAt: warehouse.createdAt,
      branch: warehouse.branch,
    };
  }

  async update(id: string, dto: UpdateWarehouseDto, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (dto.code && dto.code !== warehouse.code) {
      const existingByCode = await this.prisma.warehouse.findFirst({
        where: { code: dto.code, tenantId, id: { not: id } },
      });
      if (existingByCode) {
        throw new ConflictException('Warehouse code already exists in this tenant');
      }
    }

    const targetBranchId = dto.branchId || warehouse.branchId;

    if (dto.branchId && dto.branchId !== warehouse.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found in this tenant');
      }
      if (!branch.isActive) {
        throw new BadRequestException('Target branch is not active');
      }
    }

    if (dto.isDefault && !warehouse.isDefault) {
      const existingDefault = await this.prisma.warehouse.findFirst({
        where: { isDefault: true, tenantId, branchId: targetBranchId, id: { not: id } },
      });

      if (existingDefault) {
        await this.prisma.warehouse.update({
          where: { id: existingDefault.id },
          data: { isDefault: false },
        });
      }
    }

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
      include: {
        branch: {
          select: { id: true, nameAr: true, nameEn: true, code: true },
        },
      },
    });

    this.logger.log(`Warehouse updated: ${updated.nameEn}`);

    return {
      id: updated.id,
      nameAr: updated.nameAr,
      nameEn: updated.nameEn,
      code: updated.code,
      branchId: updated.branchId,
      isDefault: updated.isDefault,
      updatedAt: updated.updatedAt,
      branch: updated.branch,
    };
  }

  async remove(id: string, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const stockCount = await this.prisma.stockLevel.count({
      where: { warehouseId: id },
    });

    if (stockCount > 0) {
      throw new BadRequestException(
        `Cannot delete warehouse with ${stockCount} stock entries. Clear inventory first.`,
      );
    }

    await this.prisma.warehouse.delete({ where: { id } });

    this.logger.log(`Warehouse deleted (soft): ${warehouse.nameEn}`);

    return { message: 'Warehouse deleted successfully' };
  }

  async toggleDefault(id: string, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (!warehouse.isDefault) {
      const existingDefault = await this.prisma.warehouse.findFirst({
        where: { isDefault: true, tenantId, branchId: warehouse.branchId, id: { not: id } },
      });

      if (existingDefault) {
        await this.prisma.warehouse.update({
          where: { id: existingDefault.id },
          data: { isDefault: false },
        });
      }
    }

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: { isDefault: !warehouse.isDefault },
    });

    this.logger.log(`Warehouse default ${updated.isDefault ? 'set' : 'unset'}: ${updated.nameEn}`);

    return {
      id: updated.id,
      isDefault: updated.isDefault,
      message: `Warehouse ${updated.isDefault ? 'set as default' : 'unset as default'} successfully`,
    };
  }
}