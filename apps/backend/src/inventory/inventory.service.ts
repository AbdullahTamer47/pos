import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StockMovementDto } from './dto/stock-movement.dto';
import { StockAdjustDto } from './dto/stock-adjust.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';

const CACHE_TTL = 600;
const CACHE_PREFIX = 'inventory';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getStock(query: {
    page?: number;
    limit?: number;
    warehouseId?: string;
    productId?: string;
    lowStock?: boolean;
    tenantId: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId: query.tenantId };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.productId) where.productId = query.productId;

    const [stockLevels, total] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { product: { nameEn: 'asc' } },
        include: {
          warehouse: { select: { id: true, nameAr: true, nameEn: true, code: true } },
          product: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              sku: true,
              barcode: true,
              unit: true,
              lowStockAlert: true,
              hasExpiry: true,
              expiryDays: true,
            },
          },
          variant: { select: { id: true, name: true, sku: true } },
        },
      }),
      this.prisma.stockLevel.count({ where }),
    ]);

    let data = stockLevels;
    if (query.lowStock) {
      data = stockLevels.filter(
        (s) => s.quantity <= s.product.lowStockAlert,
      );
    }

    return {
      data: data.map((s) => ({
        id: s.id,
        warehouseId: s.warehouseId,
        warehouse: s.warehouse,
        productId: s.productId,
        product: s.product,
        variantId: s.variantId,
        variant: s.variant,
        quantity: s.quantity,
        minQuantity: s.minQuantity,
        maxQuantity: s.maxQuantity,
        isLowStock: s.quantity <= s.product.lowStockAlert,
        lastCountedAt: s.lastCountedAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStockByProduct(productId: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { productId, tenantId },
      include: {
        warehouse: { select: { id: true, nameAr: true, nameEn: true, code: true } },
        variant: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { warehouse: { nameEn: 'asc' } },
    });

    const totalQuantity = stockLevels.reduce((sum, s) => sum + s.quantity, 0);

    return {
      productId: product.id,
      productName: product.nameEn,
      productSku: product.sku,
      lowStockAlert: product.lowStockAlert,
      totalQuantity,
      byWarehouse: stockLevels.map((s) => ({
        warehouseId: s.warehouseId,
        warehouse: s.warehouse,
        variantId: s.variantId,
        variant: s.variant,
        quantity: s.quantity,
        minQuantity: s.minQuantity,
        maxQuantity: s.maxQuantity,
        lastCountedAt: s.lastCountedAt,
      })),
    };
  }

  async adjustStock(dto: StockAdjustDto, tenantId: string, performedById: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId },
      });
      if (!variant) {
        throw new NotFoundException('Variant not found for this product');
      }
    }

    const existingStock = await this.prisma.stockLevel.findFirst({
      where: {
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    const previousQuantity = existingStock?.quantity || 0;
    const newQuantity = dto.quantity;
    const movementType = 'STOCKTAKING';

    const [stockLevel, movement] = await this.prisma.$transaction(async (tx) => {
      let sl;
      if (existingStock) {
        sl = await tx.stockLevel.update({
          where: { id: existingStock.id },
          data: {
            quantity: newQuantity,
            lastCountedAt: new Date(),
          },
        });
      } else {
        sl = await tx.stockLevel.create({
          data: {
            tenantId,
            warehouseId: dto.warehouseId,
            productId: dto.productId,
            variantId: dto.variantId || null,
            quantity: newQuantity,
            lastCountedAt: new Date(),
          },
        });
      }

      const mov = await tx.inventoryMovement.create({
        data: {
          tenantId,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          variantId: dto.variantId || null,
          type: movementType,
          quantity: newQuantity - previousQuantity,
          previousQuantity,
          newQuantity,
          referenceType: 'ADJUSTMENT',
          note: dto.note || 'Manual inventory adjustment',
          performedById,
        },
      });

      return [sl, mov];
    });

    await this.checkLowStockAlert(product, dto.warehouseId, newQuantity, tenantId);

    this.logger.log(`Stock adjusted: ${product.nameEn} in ${warehouse.nameEn} to ${newQuantity}`);
    await this.invalidateInventoryCache(tenantId);

    return {
      stockLevel,
      movement: {
        id: movement.id,
        type: movement.type,
        previousQuantity: movement.previousQuantity,
        newQuantity: movement.newQuantity,
        quantity: movement.quantity,
      },
    };
  }

  async transferStock(dto: StockTransferDto, tenantId: string, performedById: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Cannot transfer to the same warehouse');
    }

    const [fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.warehouse.findFirst({ where: { id: dto.fromWarehouseId, tenantId } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.toWarehouseId, tenantId } }),
    ]);

    if (!fromWarehouse) throw new NotFoundException('Source warehouse not found');
    if (!toWarehouse) throw new NotFoundException('Destination warehouse not found');

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId },
      });
      if (!variant) throw new NotFoundException('Variant not found for this product');
    }

    const fromStock = await this.prisma.stockLevel.findFirst({
      where: {
        warehouseId: dto.fromWarehouseId,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    if (!fromStock || fromStock.quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${fromStock?.quantity || 0}, Requested: ${dto.quantity}`,
      );
    }

    const toStock = await this.prisma.stockLevel.findFirst({
      where: {
        warehouseId: dto.toWarehouseId,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    const fromNewQuantity = fromStock.quantity - dto.quantity;
    const toNewQuantity = (toStock?.quantity || 0) + dto.quantity;

    const [updatedFrom, updatedTo, outMovement, inMovement] = await this.prisma.$transaction(async (tx) => {
      const from = await tx.stockLevel.update({
        where: { id: fromStock.id },
        data: { quantity: fromNewQuantity },
      });

      let to;
      if (toStock) {
        to = await tx.stockLevel.update({
          where: { id: toStock.id },
          data: { quantity: toNewQuantity },
        });
      } else {
        to = await tx.stockLevel.create({
          data: {
            tenantId,
            warehouseId: dto.toWarehouseId,
            productId: dto.productId,
            variantId: dto.variantId || null,
            quantity: toNewQuantity,
          },
        });
      }
      const outMovement = await tx.inventoryMovement.create({
        data: {
          tenantId,
          warehouseId: dto.fromWarehouseId,
          productId: dto.productId,
          variantId: dto.variantId || null,
          type: 'TRANSFER',
          quantity: -dto.quantity,
          previousQuantity: fromStock.quantity,
          newQuantity: fromNewQuantity,
          referenceType: 'TRANSFER',
          note: dto.note || `Transferred to ${toWarehouse.nameEn}`,
          performedById,
        },
      });

      const inMovement = await tx.inventoryMovement.create({
        data: {
          tenantId,
          warehouseId: dto.toWarehouseId,
          productId: dto.productId,
          variantId: dto.variantId || null,
          type: 'TRANSFER',
          quantity: dto.quantity,
          previousQuantity: toStock?.quantity || 0,
          newQuantity: toNewQuantity,
          referenceType: 'TRANSFER',
          note: dto.note || `Transferred from ${fromWarehouse.nameEn}`,
          performedById,
        },
      });

      return [from, to, outMovement, inMovement];
    });

    await this.checkLowStockAlert(product, dto.fromWarehouseId, fromNewQuantity, tenantId);

    this.logger.log(`Stock transferred: ${product.nameEn} from ${fromWarehouse.nameEn} to ${toWarehouse.nameEn}`);
    await this.invalidateInventoryCache(tenantId);

    return {
      from: { warehouse: fromWarehouse.nameEn, quantity: updatedFrom.quantity },
      to: { warehouse: toWarehouse.nameEn, quantity: updatedTo.quantity },
      message: 'Transfer completed successfully',
    };
  }

  async getMovements(query: {
    page?: number;
    limit?: number;
    type?: string;
    productId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    tenantId: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId: query.tenantId };
    if (query.type) where.type = query.type;
    if (query.productId) where.productId = query.productId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as Record<string, unknown>).gte = new Date(query.startDate);
      if (query.endDate) (where.createdAt as Record<string, unknown>).lte = new Date(query.endDate);
    }

    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, nameAr: true, nameEn: true, code: true } },
          product: { select: { id: true, nameAr: true, nameEn: true, sku: true, unit: true } },
          variant: { select: { id: true, name: true, sku: true } },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: movements,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAlerts(tenantId: string) {
    const alerts = await this.prisma.stockAlert.findMany({
      where: { tenantId, isResolved: false },
      include: {
        warehouse: { select: { id: true, nameAr: true, nameEn: true, code: true } },
        product: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            sku: true,
            barcode: true,
            lowStockAlert: true,
            hasExpiry: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts;
  }

  async resolveAlert(id: string, tenantId: string) {
    const alert = await this.prisma.stockAlert.findFirst({
      where: { id, tenantId },
    });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updated = await this.prisma.stockAlert.update({
      where: { id },
      data: { isResolved: true, resolvedAt: new Date() },
    });

    this.logger.log(`Stock alert resolved: ${id}`);
    return updated;
  }

  async getExpiringProducts(query: {
    daysBefore?: number;
    daysAfter?: number;
    tenantId: string;
  }) {
    const daysBefore = query.daysBefore || 0;
    const daysAfter = query.daysAfter || 30;
    const now = new Date();
    const fromDate = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);
    const toDate = new Date(now.getTime() + daysAfter * 24 * 60 * 60 * 1000);

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: query.tenantId,
        hasExpiry: true,
        isActive: true,
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        sku: true,
        barcode: true,
        expiryDays: true,
        stockLevels: {
          where: { quantity: { gt: 0 } },
          include: {
            warehouse: { select: { id: true, nameAr: true, nameEn: true, code: true } },
          },
        },
      },
    });

    return products
      .filter((p) => p.expiryDays !== null)
      .map((p) => {
        const expiryDays = p.expiryDays!;
        return {
          ...p,
          expiresInDays: expiryDays,
          isExpiringSoon: expiryDays <= daysAfter,
          isExpired: expiryDays <= 0,
        };
      })
      .filter((p) => p.expiryDays! >= daysBefore && p.expiryDays! <= daysAfter);
  }

  private async checkLowStockAlert(
    product: { id: string; lowStockAlert: number; nameEn: string },
    warehouseId: string,
    currentQuantity: number,
    tenantId: string,
  ) {
    if (currentQuantity <= product.lowStockAlert) {
      const existingAlert = await this.prisma.stockAlert.findFirst({
        where: {
          tenantId,
          warehouseId,
          productId: product.id,
          isResolved: false,
        },
      });

      if (!existingAlert) {
        await this.prisma.stockAlert.create({
          data: {
            tenantId,
            warehouseId,
            productId: product.id,
            threshold: product.lowStockAlert,
            currentQuantity,
          },
        });
        this.logger.warn(`Low stock alert: ${product.nameEn} (${currentQuantity} <= ${product.lowStockAlert})`);
      } else {
        await this.prisma.stockAlert.update({
          where: { id: existingAlert.id },
          data: { currentQuantity },
        });
      }
    }
  }

  private async invalidateInventoryCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}