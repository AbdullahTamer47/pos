import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ReportJobData } from '../queues.service';

@Injectable()
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async process(job: Job<ReportJobData>) {
    const { reportId, tenantId, userId, reportType, format, params } = job.data;

    this.logger.log(`Processing report job ${job.id}: ${reportType} for tenant ${tenantId}`);

    try {
      await job.updateProgress(10);

      const reportData = await this.generateReportData(reportType, tenantId, params, job);

      await job.updateProgress(70);

      const formattedReport = this.formatReport(reportData, format, reportType);

      await job.updateProgress(90);

      const cacheKey = `report:${tenantId}:${reportType}:${reportId}`;
      await this.redis.set(cacheKey, JSON.stringify(reportData), 3600);

      await this.prisma.$executeRawUnsafe(
        `UPDATE "Report" SET status = 'COMPLETED', "completedAt" = NOW() WHERE id = $1`,
        reportId,
      );

      await job.updateProgress(100);

      this.logger.log(`Report completed: ${reportId} (${reportType})`);

      return {
        reportId,
        reportType,
        format,
        status: 'COMPLETED',
        cachedAt: cacheKey,
        recordCount: Array.isArray(reportData) ? reportData.length : 0,
      };
    } catch (error) {
      this.logger.error(`Report generation failed: ${reportId}`, (error as Error).stack);

      await this.prisma.$executeRawUnsafe(
        `UPDATE "Report" SET status = 'FAILED', "errorMessage" = $1 WHERE id = $2`,
        (error as Error).message,
        reportId,
      );

      throw error;
    }
  }

  private async generateReportData(
    reportType: string,
    tenantId: string,
    params: Record<string, unknown>,
    job: Job,
  ): Promise<unknown> {
    switch (reportType) {
      case 'sales': {
        const { startDate, endDate, branchId, userId } = params;
        const where: Record<string, unknown> = {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        };
        if (branchId) where.branchId = branchId;
        if (userId) where.cashierId = userId;

        await job.updateProgress(25);

        const invoices = await this.prisma.invoice.findMany({
          where,
          include: {
            branch: { select: { nameAr: true, nameEn: true } },
            cashier: { select: { name: true } },
            items: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        await job.updateProgress(50);

        const summary = {
          totalInvoices: invoices.length,
          totalSales: invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0),
          totalVat: invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0),
          totalDiscount: invoices.reduce((sum, inv) => sum + Number(inv.discountAmount || 0), 0),
          totalItems: invoices.reduce((sum, inv) => sum + inv.items.length, 0),
          averageOrderValue: invoices.length > 0
            ? invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0) / invoices.length
            : 0,
          period: { startDate, endDate },
        };

        return {
          type: 'sales',
          summary,
          details: invoices,
          generatedAt: new Date().toISOString(),
        };
      }

      case 'inventory': {
        const { warehouseId, categoryId, onlyLowStock } = params;
        const where: Record<string, unknown> = { tenantId, isActive: true };
        if (categoryId) where.categoryId = categoryId;

        const products = await this.prisma.product.findMany({
          where,
          include: {
            category: { select: { nameAr: true, nameEn: true } },
            variants: true,
            stockLevels: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        await job.updateProgress(50);

        let inventoryData = products.map((p) => {
          const totalStock = p.stockLevels.reduce((s, sl) => s + sl.quantity, 0);
          return {
            productId: p.id,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            sku: p.sku,
            barcode: p.barcode,
            category: p.category?.nameAr || 'N/A',
            costPrice: Number(p.costPrice || 0),
            sellingPrice: Number(p.sellingPrice || 0),
            stock: totalStock,
            minStock: p.lowStockAlert,
            maxStock: p.lowStockAlert * 10,
            status: totalStock <= p.lowStockAlert ? 'LOW_STOCK' : 'NORMAL',
            variantCount: p.variants.length,
          };
        });

        if (onlyLowStock) {
          inventoryData = inventoryData.filter((item) => item.status === 'LOW_STOCK');
        }

        const summary = {
          totalProducts: inventoryData.length,
          lowStockCount: inventoryData.filter((i) => i.status === 'LOW_STOCK').length,
          overStockCount: inventoryData.filter((i) => i.status === 'OVERSTOCK').length,
          totalStockValue: inventoryData.reduce((sum, i) => sum + i.stock * Number(i.costPrice || 0), 0),
          totalRetailValue: inventoryData.reduce((sum, i) => sum + i.stock * Number(i.sellingPrice || 0), 0),
        };

        return {
          type: 'inventory',
          summary,
          details: inventoryData,
          generatedAt: new Date().toISOString(),
        };
      }

      case 'profit': {
        const { startDate, endDate, branchId } = params;
        const where: Record<string, unknown> = {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        };
        if (branchId) where.branchId = branchId;

        const invoices = await this.prisma.invoice.findMany({
          where,
          include: { items: true },
          orderBy: { createdAt: 'asc' },
        });

        await job.updateProgress(50);

        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
        const totalCost = invoices.reduce((sum, inv) =>
          sum + inv.items.reduce((itemSum, item) => itemSum + Number(item.costPrice || 0) * item.quantity, 0), 0);
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const dailyBreakdown = new Map<string, { revenue: number; cost: number; profit: number; count: number }>();
        for (const inv of invoices) {
          const date = inv.createdAt.toISOString().split('T')[0] || '';
          const existing = dailyBreakdown.get(date) || { revenue: 0, cost: 0, profit: 0, count: 0 };
          const invCost = inv.items.reduce((s, i) => s + Number(i.costPrice || 0) * i.quantity, 0);
          existing.revenue += Number(inv.grandTotal || 0);
          existing.cost += invCost;
          existing.profit += Number(inv.grandTotal || 0) - invCost;
          existing.count += 1;
          dailyBreakdown.set(date, existing);
        }

        return {
          type: 'profit',
          summary: {
            totalRevenue,
            totalCost,
            grossProfit,
            profitMargin: Math.round(profitMargin * 100) / 100,
            totalInvoices: invoices.length,
            period: { startDate, endDate },
          },
          dailyBreakdown: Array.from(dailyBreakdown.entries()).map(([date, data]) => ({
            date,
            ...data,
          })),
          generatedAt: new Date().toISOString(),
        };
      }

      case 'tax': {
        const { startDate, endDate } = params;
        const where: Record<string, unknown> = {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        };

        const invoices = await this.prisma.invoice.findMany({
          where,
          include: {
            items: true,
            branch: { select: { nameAr: true, nameEn: true } },
          },
          orderBy: { createdAt: 'asc' },
        });

        await job.updateProgress(50);

        const vatRates = new Map<number, { count: number; totalVat: number; netAmount: number }>();
        for (const inv of invoices) {
          for (const item of inv.items) {
            const rate = item.taxRate;
            const existing = vatRates.get(rate) || { count: 0, totalVat: 0, netAmount: 0 };
            const netAmount = Number(item.totalPrice || 0);
            existing.count += 1;
            existing.totalVat += Number(item.taxAmount || 0);
            existing.netAmount += netAmount;
            vatRates.set(rate, existing);
          }
        }

        return {
          type: 'tax',
          summary: {
            totalInvoices: invoices.length,
            totalVat: invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0),
            totalNetAmount: invoices.reduce((sum, inv) => sum + Number(inv.subtotal || 0), 0),
            period: { startDate, endDate },
          },
          vatBreakdown: Array.from(vatRates.entries()).map(([rate, data]) => ({
            vatRate: rate,
            ...data,
          })),
          details: invoices.map((inv) => ({
            invoiceNumber: inv.invoiceNumber,
            date: inv.createdAt.toISOString(),
            branch: inv.branch?.nameAr || 'N/A',
            subtotal: Number(inv.subtotal || 0),
            vatTotal: Number(inv.taxAmount || 0),
            grandTotal: Number(inv.grandTotal || 0),
            isZatcaReported: inv.zatcaStatus === 'REPORTED' || inv.zatcaStatus === 'CLEARED',
          })),
          generatedAt: new Date().toISOString(),
        };
      }

      case 'customer': {
        const { startDate, endDate, tier } = params;
        const invoiceWhere: Record<string, unknown> = {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        };

        const invoices = await this.prisma.invoice.findMany({
          where: invoiceWhere,
          include: {
            customer: { select: { id: true, name: true, phone: true, tier: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        await job.updateProgress(50);

        const customerMap = new Map<string, {
          customer: Record<string, unknown>;
          totalSpent: number;
          invoiceCount: number;
          lastPurchase: Date;
        }>();

        for (const inv of invoices) {
          if (!inv.customerId || !inv.customer) continue;
          const c = inv.customer;
          const existing = customerMap.get(c.id) || {
            customer: { id: c.id, fullName: c.name, name: c.name, phone: c.phone, tier: c.tier },
            totalSpent: 0,
            invoiceCount: 0,
            lastPurchase: inv.createdAt,
          };
          existing.totalSpent += Number(inv.grandTotal || 0);
          existing.invoiceCount += 1;
          if (inv.createdAt > existing.lastPurchase) {
            existing.lastPurchase = inv.createdAt;
          }
          customerMap.set(c.id, existing);
        }

        let customers = Array.from(customerMap.values());
        if (tier) {
          customers = customers.filter((c) => c.customer.tier === tier);
        }

        return {
          type: 'customer',
          summary: {
            totalCustomers: customers.length,
            totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
            averageSpentPerCustomer: customers.length > 0
              ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length
              : 0,
            period: { startDate, endDate },
          },
          details: customers.sort((a, b) => b.totalSpent - a.totalSpent),
          generatedAt: new Date().toISOString(),
        };
      }

      default:
        this.logger.warn(`Unknown report type: ${reportType}`);
        return {
          type: reportType,
          message: 'Report type not implemented',
          generatedAt: new Date().toISOString(),
        };
    }
  }

  private formatReport(data: unknown, format: string, reportType: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv': {
        const reportData = data as Record<string, unknown>;
        const details = (reportData.details as Array<Record<string, unknown>>) || [];
        if (details.length === 0) return '';

        const headers = Object.keys(details[0] || {});
        const rows = details.map((row) =>
          headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        );

        return [headers.join(','), ...rows].join('\n');
      }

      case 'pdf':
      case 'excel':
        return JSON.stringify(data);

      default:
        return JSON.stringify(data);
    }
  }
}