import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ReportQueryDto } from './dto/report-query.dto';

const CACHE_TTL = 300;
const CACHE_PREFIX = 'reports';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private buildCacheKey(reportName: string, tenantId: string, params: string): string {
    return `${CACHE_PREFIX}:${reportName}:${tenantId}:${params}`;
  }

  private getDateRange(query: ReportQueryDto) {
    const now = new Date();
    const endDate = query.endDate ? new Date(query.endDate) : now;
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate, endDate };
  }

  async getSalesReport(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('sales', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);

    const where: Record<string, unknown> = {
      tenantId,
      status: 'COMPLETED',
      type: 'SALE',
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.branchId) where.branchId = query.branchId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        grandTotal: true,
        discountAmount: true,
        taxAmount: true,
        subtotal: true,
        paidAmount: true,
        createdAt: true,
        branch: { select: { id: true, nameAr: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const summary = {
      totalSales: invoices.length,
      totalRevenue: invoices.reduce((s, i) => s + Number(i.grandTotal), 0),
      totalDiscount: invoices.reduce((s, i) => s + Number(i.discountAmount), 0),
      totalTax: invoices.reduce((s, i) => s + Number(i.taxAmount), 0),
      totalSubtotal: invoices.reduce((s, i) => s + Number(i.subtotal), 0),
      averageSale: invoices.length
        ? invoices.reduce((s, i) => s + Number(i.grandTotal), 0) / invoices.length
        : 0,
    };

    let grouped: Record<string, unknown>[] = [];
    if (query.groupBy) {
      grouped = this.groupSalesBy(invoices, query.groupBy);
    }

    const result = {
      summary: {
        ...summary,
        totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
        totalDiscount: Math.round(summary.totalDiscount * 100) / 100,
        totalTax: Math.round(summary.totalTax * 100) / 100,
        totalSubtotal: Math.round(summary.totalSubtotal * 100) / 100,
        averageSale: Math.round(summary.averageSale * 100) / 100,
      },
      grouped,
      transactions: invoices,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  private groupSalesBy(
    invoices: Array<{ createdAt: Date; grandTotal: unknown }>,
    groupBy: string,
  ) {
    const groups = new Map<string, { count: number; revenue: number }>();

    for (const inv of invoices) {
      const date = new Date(inv.createdAt);
      let key: string;
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const week = Math.ceil(
          ((date.getTime() - startOfYear.getTime()) / 86400000 +
            startOfYear.getDay() +
            1) /
            7,
        );
        key = `${date.getFullYear()}-W${week}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = groups.get(key) || { count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += Number(inv.grandTotal);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([period, data]) => ({
      period,
      count: data.count,
      revenue: Math.round(data.revenue * 100) / 100,
    }));
  }

  async getProfitLossReport(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('profit-loss', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);
    const invoiceWhere: Record<string, unknown> = {
      tenantId,
      status: 'COMPLETED',
      type: 'SALE',
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.branchId) invoiceWhere.branchId = query.branchId;

    const expenseWhere: Record<string, unknown> = {
      tenantId,
      expenseDate: { gte: startDate, lte: endDate },
    };
    if (query.branchId) expenseWhere.branchId = query.branchId;

    const revenueWhere: Record<string, unknown> = {
      tenantId,
      revenueDate: { gte: startDate, lte: endDate },
    };
    if (query.branchId) revenueWhere.branchId = query.branchId;

    const [invoices, invoiceItems, expenses, revenues] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        select: { grandTotal: true, subtotal: true, discountAmount: true, taxAmount: true },
      }),
      this.prisma.invoiceItem.findMany({
        where: { invoice: { ...invoiceWhere } },
        select: { costPrice: true, quantity: true },
      }),
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true, category: true },
      }),
      this.prisma.revenue.findMany({
        where: revenueWhere,
        select: { amount: true, category: true },
      }),
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + Number(i.grandTotal), 0);
    const totalSubtotal = invoices.reduce((s, i) => s + Number(i.subtotal), 0);
    const totalDiscount = invoices.reduce((s, i) => s + Number(i.discountAmount), 0);
    const totalTax = invoices.reduce((s, i) => s + Number(i.taxAmount), 0);
    const cogs = invoiceItems.reduce(
      (s, item) => s + Number(item.costPrice ?? 0) * item.quantity,
      0,
    );
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalOtherRevenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit + totalOtherRevenue - totalExpenses;

    const expenseByCategory = this.groupByCategory(expenses);
    const revenueByCategory = this.groupByCategory(revenues);

    const result = {
      revenue: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSubtotal: Math.round(totalSubtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        otherRevenue: Math.round(totalOtherRevenue * 100) / 100,
      },
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      expenses: {
        total: Math.round(totalExpenses * 100) / 100,
        byCategory: expenseByCategory,
      },
      otherRevenueByCategory: revenueByCategory,
      netProfit: Math.round(netProfit * 100) / 100,
      period: { startDate, endDate },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  private groupByCategory(
    items: Array<{ amount: unknown; category: string }>,
  ): Record<string, number> {
    const map: Record<string, number> = {};
    for (const item of items) {
      const cat = item.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(item.amount);
    }
    for (const key of Object.keys(map)) {
      map[key] = Math.round(map[key] * 100) / 100;
    }
    return map;
  }

  async getInventoryStatus(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('inventory-status', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where: Record<string, unknown> = { tenantId };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.categoryId) {
      where.product = { categoryId: query.categoryId };
    }

    const stockLevels = await this.prisma.stockLevel.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            sku: true,
            barcode: true,
            costPrice: true,
            sellingPrice: true,
            unit: true,
            lowStockAlert: true,
            category: { select: { id: true, nameAr: true } },
          },
        },
        warehouse: { select: { id: true, nameAr: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: { quantity: 'asc' },
    });

    const items = stockLevels.map((sl) => ({
      productId: sl.productId,
      productName: sl.product.nameAr,
      productSku: sl.product.sku,
      barcode: sl.product.barcode,
      variantId: sl.variantId,
      variantName: sl.variant?.name,
      warehouseId: sl.warehouseId,
      warehouseName: sl.warehouse.nameAr,
      category: sl.product.category?.nameAr,
      quantity: sl.quantity,
      costPrice: Number(sl.product.costPrice),
      sellingPrice: Number(sl.product.sellingPrice),
      stockValue: sl.quantity * Number(sl.product.costPrice),
      potentialRevenue: sl.quantity * Number(sl.product.sellingPrice),
      lowStockAlert: sl.product.lowStockAlert,
      isLowStock: sl.quantity <= sl.product.lowStockAlert,
    }));

    const totalStockValue = items.reduce((s, i) => s + i.stockValue, 0);
    const totalPotentialRevenue = items.reduce((s, i) => s + i.potentialRevenue, 0);
    const lowStockItems = items.filter((i) => i.isLowStock);
    const outOfStockItems = items.filter((i) => i.quantity <= 0);

    const result = {
      totalItems: items.length,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      items,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getInventoryMovements(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('inventory-movements', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);

    const where: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const movements = await this.prisma.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { id: true, nameAr: true, sku: true } },
        warehouse: { select: { id: true, nameAr: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 200,
    });

    const typeSummary: Record<string, { count: number; totalQuantity: number }> = {};
    for (const m of movements) {
      if (!typeSummary[m.type]) {
        typeSummary[m.type] = { count: 0, totalQuantity: 0 };
      }
      typeSummary[m.type].count++;
      typeSummary[m.type].totalQuantity += m.quantity;
    }

    const result = {
      movements: movements.map((m) => ({
        ...m,
        productName: m.product.nameAr,
        warehouseName: m.warehouse.nameAr,
        variantName: m.variant?.name,
      })),
      summary: typeSummary,
      totalMovements: movements.length,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getTopProducts(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('top-products', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);
    const sortBy = query.sortBy || 'revenue';

    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          tenantId,
          status: 'COMPLETED',
          type: 'SALE',
          createdAt: { gte: startDate, lte: endDate },
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
      },
      include: {
        product: {
          select: { id: true, nameAr: true, nameEn: true, sku: true, barcode: true, costPrice: true },
        },
      },
    });

    const productMap = new Map<
      string,
      { product: Record<string, unknown>; quantity: number; revenue: number; cost: number }
    >();

    for (const item of invoiceItems) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += Number(item.totalPrice);
        existing.cost += Number(item.costPrice ?? 0) * item.quantity;
      } else {
        productMap.set(item.productId, {
          product: {
            id: item.product.id,
            nameAr: item.product.nameAr,
            nameEn: item.product.nameEn,
            sku: item.product.sku,
            barcode: item.product.barcode,
          },
          quantity: item.quantity,
          revenue: Number(item.totalPrice),
          cost: Number(item.costPrice ?? 0) * item.quantity,
        });
      }
    }

    const products = Array.from(productMap.values()).map((p) => ({
      ...p.product,
      quantity: p.quantity,
      revenue: Math.round(p.revenue * 100) / 100,
      cost: Math.round(p.cost * 100) / 100,
      profit: Math.round((p.revenue - p.cost) * 100) / 100,
      profitMargin:
        p.revenue > 0
          ? Math.round(((p.revenue - p.cost) / p.revenue) * 10000) / 100
          : 0,
    }));

    products.sort((a, b) => {
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      return b.revenue - a.revenue;
    });

    const limit = query.limit || 20;
    const result = {
      products: products.slice(0, limit),
      totalUniqueProducts: products.length,
      totalQuantity: products.reduce((s, p) => s + p.quantity, 0),
      totalRevenue: Math.round(products.reduce((s, p) => s + p.revenue, 0) * 100) / 100,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getSlowMovingProducts(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('slow-moving', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);

    const where: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const [stockLevels, invoiceItems] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        include: {
          product: {
            select: { id: true, nameAr: true, sku: true, costPrice: true, sellingPrice: true },
          },
          warehouse: { select: { id: true, nameAr: true } },
        },
      }),
      this.prisma.invoiceItem.findMany({
        where: {
          invoice: {
            tenantId,
            status: 'COMPLETED',
            type: 'SALE',
            createdAt: { gte: startDate, lte: endDate },
            ...(query.branchId ? { branchId: query.branchId } : {}),
          },
        },
        select: { productId: true, quantity: true },
      }),
    ]);

    const salesByProduct = new Map<string, number>();
    for (const item of invoiceItems) {
      salesByProduct.set(
        item.productId,
        (salesByProduct.get(item.productId) || 0) + item.quantity,
      );
    }

    const products = stockLevels
      .filter((sl) => sl.quantity > 0)
      .map((sl) => {
        const soldQuantity = salesByProduct.get(sl.productId) || 0;
        return {
          productId: sl.productId,
          productName: sl.product.nameAr,
          sku: sl.product.sku,
          warehouseName: sl.warehouse.nameAr,
          currentStock: sl.quantity,
          soldQuantity,
          stockValue: sl.quantity * Number(sl.product.costPrice),
          daysSinceLastSale: soldQuantity === 0 ? 'No sales' : undefined,
        };
      })
      .sort((a, b) => a.soldQuantity - b.soldQuantity);

    const limit = query.limit || 20;
    const result = {
      products: products.slice(0, limit),
      totalSlowMoving: products.filter((p) => p.soldQuantity === 0).length,
      totalLowSelling: products.filter((p) => p.soldQuantity > 0 && p.soldQuantity <= 5).length,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getCashierPerformance(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('cashier-performance', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        type: 'SALE',
        createdAt: { gte: startDate, lte: endDate },
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.cashierId ? { cashierId: query.cashierId } : {}),
      },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, nameAr: true } },
      },
    });

    const cashierMap = new Map<
      string,
      {
        cashier: { id: string; name: string; email: string };
        branch: { id: string; nameAr: string };
        salesCount: number;
        totalSales: number;
        totalDiscount: number;
        totalRefund: number;
        refundCount: number;
      }
    >();

    for (const inv of invoices) {
      const key = inv.cashierId || 'unknown';
      if (!cashierMap.has(key)) {
        cashierMap.set(key, {
          cashier: inv.cashier
            ? { id: inv.cashier.id, name: inv.cashier.name, email: inv.cashier.email }
            : { id: 'unknown', name: 'Unknown', email: '' },
          branch: inv.branch ? { id: inv.branch.id, nameAr: inv.branch.nameAr } : { id: '', nameAr: '' },
          salesCount: 0,
          totalSales: 0,
          totalDiscount: 0,
          totalRefund: 0,
          refundCount: 0,
        });
      }

      const entry = cashierMap.get(key)!;
      if (inv.type === 'RETURN_SALE') {
        entry.refundCount++;
        entry.totalRefund += Number(inv.grandTotal);
      } else {
        entry.salesCount++;
        entry.totalSales += Number(inv.grandTotal);
        entry.totalDiscount += Number(inv.discountAmount);
      }
    }

    const performers = Array.from(cashierMap.values()).map((c) => ({
      cashier: c.cashier,
      branch: c.branch,
      salesCount: c.salesCount,
      totalSales: Math.round(c.totalSales * 100) / 100,
      averageSale: c.salesCount > 0 ? Math.round((c.totalSales / c.salesCount) * 100) / 100 : 0,
      totalDiscount: Math.round(c.totalDiscount * 100) / 100,
      refundCount: c.refundCount,
      totalRefund: Math.round(c.totalRefund * 100) / 100,
    }));

    const result = {
      performers,
      totalCashiers: performers.length,
      totalSales: Math.round(performers.reduce((s, p) => s + p.totalSales, 0) * 100) / 100,
      totalTransactions: performers.reduce((s, p) => s + p.salesCount, 0),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getCustomerStatement(query: ReportQueryDto, tenantId: string) {
    if (!query.customerId) {
      throw new BadRequestException('customerId is required for customer statement');
    }

    const cacheKey = this.buildCacheKey('customer-statement', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);

    const customer = await this.prisma.customer.findFirst({
      where: { id: query.customerId, tenantId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const [ledger, invoices] = await Promise.all([
      this.prisma.customerLedger.findMany({
        where: {
          tenantId,
          customerId: query.customerId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          customerId: query.customerId,
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          grandTotal: true,
          paidAmount: true,
          balanceAmount: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
    ]);

    const result = {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
      },
      currentBalance: Number(customer.balance),
      creditLimit: Number(customer.creditLimit),
      ledger: ledger.map((l) => ({
        ...l,
        amount: Number(l.amount),
        balanceBefore: Number(l.balanceBefore),
        balanceAfter: Number(l.balanceAfter),
      })),
      invoices: invoices.map((i) => ({
        ...i,
        grandTotal: Number(i.grandTotal),
        paidAmount: Number(i.paidAmount),
        balanceAmount: Number(i.balanceAmount),
      })),
      totalInvoiceAmount: Math.round(
        invoices.reduce((s, i) => s + Number(i.grandTotal), 0) * 100,
      ) / 100,
      totalPaid: Math.round(
        invoices.reduce((s, i) => s + Number(i.paidAmount), 0) * 100,
      ) / 100,
      totalOutstanding: Math.round(
        invoices.reduce((s, i) => s + Number(i.balanceAmount), 0) * 100,
      ) / 100,
      period: { startDate, endDate },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getSupplierStatement(query: ReportQueryDto, tenantId: string) {
    if (!query.supplierId) {
      throw new BadRequestException('supplierId is required for supplier statement');
    }

    const cacheKey = this.buildCacheKey('supplier-statement', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: query.supplierId, tenantId },
    });

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const [ledger, purchaseOrders] = await Promise.all([
      this.prisma.supplierLedger.findMany({
        where: {
          tenantId,
          supplierId: query.supplierId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          supplierId: query.supplierId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          expectedDate: true,
          receivedDate: true,
          createdAt: true,
        },
      }),
    ]);

    const result = {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        paymentTerms: supplier.paymentTerms,
      },
      currentBalance: Number(supplier.balance),
      ledger: ledger.map((l) => ({
        ...l,
        amount: Number(l.amount),
        balanceBefore: Number(l.balanceBefore),
        balanceAfter: Number(l.balanceAfter),
      })),
      purchaseOrders: purchaseOrders.map((po) => ({
        ...po,
        totalAmount: Number(po.totalAmount),
      })),
      totalPOAmount: Math.round(
        purchaseOrders.reduce((s, po) => s + Number(po.totalAmount), 0) * 100,
      ) / 100,
      period: { startDate, endDate },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getTaxReport(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('tax', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);

    const where: Record<string, unknown> = {
      tenantId,
      status: 'COMPLETED',
      createdAt: { gte: startDate, lte: endDate },
    };
    if (query.branchId) where.branchId = query.branchId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        subtotal: true,
        taxAmount: true,
        grandTotal: true,
        createdAt: true,
        branch: { select: { id: true, nameAr: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const salesInvoices = invoices.filter((i) => i.type === 'SALE');
    const returnInvoices = invoices.filter((i) => i.type === 'RETURN_SALE');

    const result = {
      totalTaxCollected: Math.round(
        salesInvoices.reduce((s, i) => s + Number(i.taxAmount), 0) * 100,
      ) / 100,
      totalTaxRefunded: Math.round(
        returnInvoices.reduce((s, i) => s + Number(i.taxAmount), 0) * 100,
      ) / 100,
      netTax: Math.round(
        (salesInvoices.reduce((s, i) => s + Number(i.taxAmount), 0) -
          returnInvoices.reduce((s, i) => s + Number(i.taxAmount), 0)) *
          100,
      ) / 100,
      totalSalesAmount: Math.round(
        salesInvoices.reduce((s, i) => s + Number(i.grandTotal), 0) * 100,
      ) / 100,
      totalReturnAmount: Math.round(
        returnInvoices.reduce((s, i) => s + Number(i.grandTotal), 0) * 100,
      ) / 100,
      transactionCount: invoices.length,
      salesCount: salesInvoices.length,
      returnCount: returnInvoices.length,
      invoices: invoices.map((i) => ({
        ...i,
        subtotal: Number(i.subtotal),
        taxAmount: Number(i.taxAmount),
        grandTotal: Number(i.grandTotal),
      })),
      period: { startDate, endDate },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getShiftReport(query: ReportQueryDto, tenantId: string) {
    if (!query.shiftId) {
      throw new BadRequestException('shiftId is required for shift report');
    }

    const cacheKey = this.buildCacheKey('shift', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const shift = await this.prisma.cashShift.findFirst({
      where: { id: query.shiftId, tenantId },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, nameAr: true } },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            type: true,
            grandTotal: true,
            paidAmount: true,
            paymentStatus: true,
            createdAt: true,
            payments: {
              select: { method: true, amount: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!shift) {
      throw new BadRequestException('Shift not found');
    }

    const salesInvoices = shift.invoices.filter((i) => i.type === 'SALE');
    const returnInvoices = shift.invoices.filter((i) => i.type === 'RETURN_SALE');

    const paymentMethods: Record<string, number> = {};
    for (const inv of shift.invoices) {
      for (const payment of inv.payments) {
        const method = payment.method;
        paymentMethods[method] = (paymentMethods[method] || 0) + Number(payment.amount);
      }
    }

    const result = {
      shift: {
        id: shift.id,
        shiftNumber: shift.shiftNumber,
        status: shift.status,
        openingTime: shift.openingTime,
        closingTime: shift.closingTime,
        openingCash: Number(shift.openingCash),
        expectedCash: shift.expectedCash ? Number(shift.expectedCash) : null,
        actualCash: shift.actualCash ? Number(shift.actualCash) : null,
        discrepancy: shift.discrepancy ? Number(shift.discrepancy) : null,
      },
      cashier: shift.cashier,
      branch: shift.branch,
      summary: {
        totalSales: Math.round(
          salesInvoices.reduce((s, i) => s + Number(i.grandTotal), 0) * 100,
        ) / 100,
        totalReturns: Math.round(
          returnInvoices.reduce((s, i) => s + Number(i.grandTotal), 0) * 100,
        ) / 100,
        salesCount: salesInvoices.length,
        returnCount: returnInvoices.length,
        paymentMethods: Object.fromEntries(
          Object.entries(paymentMethods).map(([k, v]) => [k, Math.round(v * 100) / 100]),
        ),
      },
      transactions: shift.invoices.map((i) => ({
        ...i,
        grandTotal: Number(i.grandTotal),
        paidAmount: Number(i.paidAmount),
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async getDailySummary(query: ReportQueryDto, tenantId: string) {
    const cacheKey = this.buildCacheKey('daily-summary', tenantId, JSON.stringify(query));
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { startDate, endDate } = this.getDateRange(query);
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const invoiceWhere: Record<string, unknown> = {
      tenantId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    };
    if (query.branchId) invoiceWhere.branchId = query.branchId;

    const expenseWhere: Record<string, unknown> = {
      tenantId,
      expenseDate: { gte: startOfDay, lte: endOfDay },
    };
    if (query.branchId) expenseWhere.branchId = query.branchId;

    const [invoices, expenses, revenues, shifts] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        select: { type: true, status: true, grandTotal: true, discountAmount: true, taxAmount: true, paidAmount: true },
      }),
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true },
      }),
      this.prisma.revenue.findMany({
        where: {
          tenantId,
          revenueDate: { gte: startOfDay, lte: endOfDay },
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
        select: { amount: true },
      }),
      this.prisma.cashShift.findMany({
        where: {
          tenantId,
          openingTime: { gte: startOfDay, lte: endOfDay },
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
        select: { id: true, status: true, openingCash: true, actualCash: true, discrepancy: true },
      }),
    ]);

    const completedSales = invoices.filter((i) => i.status === 'COMPLETED' && i.type === 'SALE');
    const completedReturns = invoices.filter((i) => i.status === 'COMPLETED' && i.type === 'RETURN_SALE');
    const heldInvoices = invoices.filter((i) => i.status === 'HELD');

    const result = {
      date: startOfDay.toISOString().split('T')[0],
      sales: {
        count: completedSales.length,
        total: Math.round(completedSales.reduce((s, i) => s + Number(i.grandTotal), 0) * 100) / 100,
        discount: Math.round(completedSales.reduce((s, i) => s + Number(i.discountAmount), 0) * 100) / 100,
        tax: Math.round(completedSales.reduce((s, i) => s + Number(i.taxAmount), 0) * 100) / 100,
        paid: Math.round(completedSales.reduce((s, i) => s + Number(i.paidAmount), 0) * 100) / 100,
      },
      returns: {
        count: completedReturns.length,
        total: Math.round(completedReturns.reduce((s, i) => s + Number(i.grandTotal), 0) * 100) / 100,
      },
      expenses: {
        count: expenses.length,
        total: Math.round(expenses.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100,
      },
      otherRevenue: {
        count: revenues.length,
        total: Math.round(revenues.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100,
      },
      holds: {
        count: heldInvoices.length,
      },
      shifts: shifts.map((s) => ({
        id: s.id,
        status: s.status,
        openingCash: Number(s.openingCash),
        actualCash: s.actualCash ? Number(s.actualCash) : null,
        discrepancy: s.discrepancy ? Number(s.discrepancy) : null,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }
}