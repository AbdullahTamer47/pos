import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

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
      where.expenseDate = {};
      if (query.startDate) {
        (where.expenseDate as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.expenseDate as Record<string, unknown>).lte = new Date(query.endDate);
      }
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          branch: { select: { id: true, nameAr: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        branch: { select: { id: true, nameAr: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return { ...expense, amount: Number(expense.amount) };
  }

  async create(dto: CreateExpenseDto, tenantId: string, userId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        receiptUrl: dto.receiptUrl,
        expenseDate: new Date(dto.expenseDate),
        createdById: userId,
      },
      include: {
        branch: { select: { id: true, nameAr: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Expense created: ${dto.category} - ${dto.amount}`);
    return { ...expense, amount: Number(expense.amount) };
  }

  async update(
    id: string,
    dto: Partial<CreateExpenseDto>,
    tenantId: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
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
    if (dto.receiptUrl !== undefined) updateData.receiptUrl = dto.receiptUrl;
    if (dto.expenseDate !== undefined) updateData.expenseDate = new Date(dto.expenseDate);
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId;

    const updated = await this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        branch: { select: { id: true, nameAr: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Expense updated: ${updated.id}`);
    return { ...updated, amount: Number(updated.amount) };
  }

  async remove(id: string, tenantId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    await this.prisma.expense.delete({ where: { id } });
    this.logger.log(`Expense deleted: ${expense.id}`);
    return { message: 'Expense deleted successfully' };
  }
}