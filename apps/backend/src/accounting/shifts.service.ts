import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private generateShiftNumber(tenantId: string): string {
    const date = new Date();
    const prefix = `SHIFT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}-${random}`;
  }

  async findAll(
    query: {
      page?: number;
      limit?: number;
      status?: string;
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

    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;

    if (query.startDate || query.endDate) {
      where.openingTime = {};
      if (query.startDate) {
        (where.openingTime as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.openingTime as Record<string, unknown>).lte = new Date(query.endDate);
      }
    }

    const [shifts, total] = await Promise.all([
      this.prisma.cashShift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openingTime: 'desc' },
        include: {
          cashier: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, nameAr: true } },
          _count: { select: { invoices: true } },
        },
      }),
      this.prisma.cashShift.count({ where }),
    ]);

    return {
      data: shifts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { id, tenantId },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, nameAr: true } },
        invoices: {
          include: {
            payments: {
              select: { method: true, amount: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const cashTransactions = shift.invoices.filter(
      (inv) =>
        inv.payments.some(
          (p) => p.method === 'CASH' && inv.status === 'COMPLETED',
        ),
    );

    const cashTotal = cashTransactions.reduce((sum, inv) => {
      const cashPayments = inv.payments
        .filter((p) => p.method === 'CASH')
        .reduce((s, p) => s + Number(p.amount), 0);
      return sum + (inv.type === 'RETURN_SALE' ? -cashPayments : cashPayments);
    }, 0);

    return {
      ...shift,
      expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
      actualCash: shift.actualCash ? Number(shift.actualCash) : null,
      discrepancy: shift.discrepancy ? Number(shift.discrepancy) : null,
      openingCash: Number(shift.openingCash),
      cashReconciliation: {
        openingCash: Number(shift.openingCash),
        cashSales: cashTotal,
        expectedCash: Number(shift.openingCash) + cashTotal,
        actualCash: shift.actualCash ? Number(shift.actualCash) : null,
        discrepancy: shift.discrepancy ? Number(shift.discrepancy) : null,
      },
    };
  }

  async getActiveShift(tenantId: string, cashierId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: {
        tenantId,
        cashierId,
        status: 'OPEN',
      },
      include: {
        branch: { select: { id: true, nameAr: true } },
        _count: { select: { invoices: true } },
      },
    });

    if (!shift) {
      return { active: false, shift: null };
    }

    return {
      active: true,
      shift: {
        ...shift,
        openingCash: Number(shift.openingCash),
      },
    };
  }

  async openShift(dto: OpenShiftDto, tenantId: string, cashierId: string) {
    const activeShift = await this.prisma.cashShift.findFirst({
      where: { tenantId, cashierId, status: 'OPEN' },
    });

    if (activeShift) {
      throw new BadRequestException('You already have an active shift. Close it first.');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const shiftNumber = this.generateShiftNumber(tenantId);

    const shift = await this.prisma.cashShift.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        cashierId,
        shiftNumber,
        openingTime: new Date(),
        openingCash: dto.openingCash,
        status: 'OPEN',
      },
      include: {
        branch: { select: { id: true, nameAr: true } },
      },
    });

    this.logger.log(`Shift opened: ${shiftNumber} by cashier ${cashierId}`);
    return shift;
  }

  async closeShift(
    id: string,
    dto: CloseShiftDto,
    tenantId: string,
    cashierId: string,
  ) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { id, tenantId },
      include: {
        invoices: {
          where: { status: 'COMPLETED' },
          include: {
            payments: { select: { method: true, amount: true } },
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status === 'CLOSED') {
      throw new BadRequestException('Shift is already closed');
    }

    if (shift.cashierId !== cashierId) {
      throw new BadRequestException('Only the shift owner can close it');
    }

    const cashTotal = shift.invoices.reduce((sum, inv) => {
      const cashPayments = inv.payments
        .filter((p) => p.method === 'CASH')
        .reduce((s, p) => s + Number(p.amount), 0);
      return sum + (inv.type === 'RETURN_SALE' ? -cashPayments : cashPayments);
    }, 0);

    const expectedCash = Number(shift.openingCash) + cashTotal;
    const discrepancy = dto.actualCash - expectedCash;

    const closed = await this.prisma.cashShift.update({
      where: { id },
      data: {
        closingTime: new Date(),
        expectedCash,
        actualCash: dto.actualCash,
        discrepancy,
        closingNote: dto.closingNote,
        status: 'CLOSED',
      },
      include: {
        branch: { select: { id: true, nameAr: true } },
        cashier: { select: { id: true, name: true } },
        invoices: {
          select: { id: true, invoiceNumber: true, type: true, grandTotal: true },
        },
      },
    });

    this.logger.log(`Shift closed: ${shift.shiftNumber}`);
    return {
      ...closed,
      expectedCash: Math.round(expectedCash * 100) / 100,
      actualCash: Math.round(dto.actualCash * 100) / 100,
      discrepancy: Math.round(discrepancy * 100) / 100,
      openingCash: Number(shift.openingCash),
      cashSales: Math.round(cashTotal * 100) / 100,
    };
  }
}