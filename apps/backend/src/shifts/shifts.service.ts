import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateShiftExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentShift(userId: string, tenantId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: {
        cashierId: userId,
        tenantId,
        status: 'OPEN',
      },
      include: {
        cashier: { select: { id: true, name: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
      },
      orderBy: { openingTime: 'desc' },
    });

    if (!shift) {
      return null;
    }

    const summary = await this.calculateShiftStats(shift.id, tenantId);
    return {
      ...shift,
      summary,
    };
  }

  async openShift(userId: string, tenantId: string, dto: OpenShiftDto) {
    // Check if cashier already has an open shift
    const existing = await this.prisma.cashShift.findFirst({
      where: {
        cashierId: userId,
        tenantId,
        status: 'OPEN',
      },
    });

    if (existing) {
      throw new ConflictException('يوجد وردية مفتوحة بالفعل لهذا الكاشير');
    }

    // Resolve branch
    let branchId = dto.branchId;
    if (!branchId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { branchId: true },
      });
      branchId = user?.branchId || undefined;
    }

    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { tenantId, isActive: true },
      });
      branchId = defaultBranch?.id;
    }

    if (!branchId) {
      throw new BadRequestException('No branch found for shift');
    }

    const shiftCount = await this.prisma.cashShift.count({ where: { tenantId } });
    const shiftNumber = `SH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(shiftCount + 1).toString().padStart(3, '0')}`;

    const shift = await this.prisma.cashShift.create({
      data: {
        tenantId,
        branchId,
        cashierId: userId,
        shiftNumber,
        openingTime: new Date(),
        openingCash: dto.openingCash,
        status: 'OPEN',
        closingNote: dto.notes,
      },
      include: {
        cashier: { select: { id: true, name: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });

    return shift;
  }

  async closeShift(shiftId: string, userId: string, tenantId: string, dto: CloseShiftDto) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { id: shiftId, tenantId },
    });

    if (!shift) {
      throw new NotFoundException('الوردية غير موجودة');
    }

    if (shift.status === 'CLOSED') {
      throw new BadRequestException('هذه الوردية مغلقة بالفعل');
    }

    const summary = await this.calculateShiftStats(shiftId, tenantId);
    const expectedCash = summary.expectedCash;
    const actualCash = dto.actualCash;
    const discrepancy = actualCash - expectedCash; // positive = surplus, negative = deficit

    const closed = await this.prisma.cashShift.update({
      where: { id: shiftId },
      data: {
        closingTime: new Date(),
        expectedCash,
        actualCash,
        discrepancy,
        closingNote: dto.closingNote,
        status: 'CLOSED',
      },
      include: {
        cashier: { select: { id: true, name: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });

    return {
      ...closed,
      summary,
    };
  }

  async addExpense(shiftId: string, userId: string, tenantId: string, dto: CreateShiftExpenseDto) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { id: shiftId, tenantId, status: 'OPEN' },
    });

    if (!shift) {
      throw new NotFoundException('الوردية المفتوحة غير موجودة');
    }

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        branchId: shift.branchId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description || `مصروفات وردية ${shift.shiftNumber}`,
        expenseDate: new Date(),
        createdById: userId,
      },
    });

    return expense;
  }

  async getShiftSummary(shiftId: string, tenantId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { id: shiftId, tenantId },
      include: {
        cashier: { select: { id: true, name: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });

    if (!shift) {
      throw new NotFoundException('الوردية غير موجودة');
    }

    const summary = await this.calculateShiftStats(shiftId, tenantId);
    return {
      shift,
      summary,
    };
  }

  private async calculateShiftStats(shiftId: string, tenantId: string) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) return { totalSales: 0, cashSales: 0, nonCashSales: 0, expenses: 0, expectedCash: 0 };

    const invoices = await this.prisma.invoice.findMany({
      where: {
        shiftId,
        tenantId,
        status: 'COMPLETED',
        type: 'SALE',
      },
      include: {
        payments: true,
      },
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        branchId: shift.branchId,
        expenseDate: {
          gte: shift.openingTime,
          lte: shift.closingTime || new Date(),
        },
      },
    });

    let totalSales = 0;
    let cashSales = 0;
    let instapaySales = 0;
    let walletSales = 0;
    let cardSales = 0;
    let creditSales = 0;
    let otherSales = 0;

    for (const inv of invoices) {
      const grandTotal = Number(inv.grandTotal);
      totalSales += grandTotal;

      if (inv.payments && inv.payments.length > 0) {
        for (const p of inv.payments) {
          const amt = Number(p.amount);
          switch (p.method) {
            case 'CASH':
              cashSales += amt;
              break;
            case 'INSTAPAY':
              instapaySales += amt;
              break;
            case 'WALLET':
            case 'VODAFONE_CASH':
              walletSales += amt;
              break;
            case 'CARD':
            case 'MEEZA':
              cardSales += amt;
              break;
            case 'CREDIT':
              creditSales += amt;
              break;
            default:
              otherSales += amt;
              break;
          }
        }
      } else {
        // Default to cash if no explicit payment records
        cashSales += grandTotal;
      }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const openingCash = Number(shift.openingCash);
    const expectedCash = openingCash + cashSales - totalExpenses;

    return {
      openingCash,
      totalSales,
      cashSales,
      instapaySales,
      walletSales,
      cardSales,
      creditSales,
      otherSales,
      totalExpenses,
      expectedCash,
      invoiceCount: invoices.length,
      expensesList: expenses,
    };
  }
}
