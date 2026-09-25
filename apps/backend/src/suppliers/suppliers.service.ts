import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'suppliers';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    query: { page?: number; limit?: number; search?: string },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { phone: { contains: query.search } },
        { email: { contains: query.search } },
        { contactPerson: { contains: query.search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { purchaseOrders: true } },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        ledgers: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async create(dto: CreateSupplierDto, tenantId: string) {
    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        contactPerson: dto.contactPerson,
        address: dto.address,
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
      },
    });

    await this.invalidateSupplierCache(tenantId);
    this.logger.log(`Supplier created: ${supplier.name}`);
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, tenantId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.contactPerson !== undefined) updateData.contactPerson = dto.contactPerson;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.paymentTerms !== undefined) updateData.paymentTerms = dto.paymentTerms;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    await this.invalidateSupplierCache(tenantId);
    this.logger.log(`Supplier updated: ${updated.name}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateSupplierCache(tenantId);
    this.logger.log(`Supplier soft-deleted: ${supplier.name}`);
    return { message: 'Supplier deleted successfully' };
  }

  async getLedger(
    supplierId: string,
    query: { page?: number; limit?: number },
    tenantId: string,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where = { tenantId, supplierId };

    const [entries, total] = await Promise.all([
      this.prisma.supplierLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierLedger.count({ where }),
    ]);

    return {
      data: entries,
      supplier: { id: supplier.id, name: supplier.name, balance: supplier.balance },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async invalidateSupplierCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}