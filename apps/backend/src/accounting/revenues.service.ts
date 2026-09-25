import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@Injectable()
export class RevenuesService {
  private readonly logger = new Logger(RevenuesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      category?: string;
      startDate?: string;
      endDate?: string;
      branchId?: string;
    },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.category) where.category = query.category;
    if (query.branchId) where.branchId = query.branchId;

    if (query.startDate || query.endDate) {
      where.revenueDate = {};
      if (query.startDate) {
        (where.revenueDate as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.revenueDate as Record<string, unknown>).lte = new Date(query.endDate);
      }
    }

    const [revenues, total] = await Promise.all([
      this.prisma.revenue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { revenueDate: 'desc' },
        include: {
          branch: { select: { id: true, nameAr: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.revenue.count({ where }),
    ]);

    const totalAmount = await this.prisma.revenue.aggregate({
      where,
      _sum: { amount: true },
    });

    return {
      data: revenues.map((r) => ({ ...r, amount: Number(r.amount) })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        totalAmount: totalAmount._sum.amount ? Number(totalAmount._sum.amount) : 0,
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, tenantId },
      include: {
        branch: { select: { id: true, nameAr: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!revenue) {
      throw new NotFoundException('Revenue entry not found');
    }

    return { ...revenue, amount: Number(revenue.amount) };
  }

  async create(dto: CreateRevenueDto, tenantId: string, userId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const revenue = await this.prisma.revenue.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        revenueDate: new Date(dto.revenueDate),
        createdById: userId,
      },
      include: {
        branch: { select: { id: true, nameAr: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Revenue created: ${dto.category} - ${dto.amount}`);
    return { ...revenue, amount: Number(revenue.amount) };
  }

  async update(
    id: string,
    dto: Partial<CreateRevenueDto>,
    tenantId: string,
  ) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, tenantId },
    });
    if (!revenue) {
      throw new NotFoundException('Revenue entry not found');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.revenueDate !== undefined) updateData.revenueDate = new Date(dto.revenueDate);
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId;

    const updated = await this.prisma.revenue.update({
      where: { id },
      data: updateData,
      include: {
        branch: { select: { id: true, nameAr: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Revenue updated: ${updated.id}`);
    return { ...updated, amount: Number(updated.amount) };
  }

  async remove(id: string, tenantId: string) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, tenantId },
    });
    if (!revenue) {
      throw new NotFoundException('Revenue entry not found');
    }

    await this.prisma.revenue.delete({ where: { id } });
    this.logger.log(`Revenue deleted: ${revenue.id}`);
    return { message: 'Revenue entry deleted successfully' };
  }

  async getSummaryByCategory(tenantId: string, startDate?: string, endDate?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (startDate || endDate) {
      where.revenueDate = {};
      if (startDate) (where.revenueDate as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.revenueDate as Record<string, unknown>).lte = new Date(endDate);
    }

    const result = await this.prisma.revenue.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    return result.map((r) => ({
      category: r.category,
      totalAmount: r._sum.amount ? Number(r._sum.amount) : 0,
      count: r._count,
    }));
  }
}