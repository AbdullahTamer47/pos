import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'purchaseorders';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['APPROVED', 'CANCELLED'],
  APPROVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      status?: string;
      supplierId?: string;
      startDate?: string;
      endDate?: string;
    },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(query.endDate);
      }
    }

    const [purchaseOrders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          branch: { select: { id: true, nameAr: true, nameEn: true } },
          warehouse: { select: { id: true, nameAr: true, nameEn: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: purchaseOrders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
        warehouse: { select: { id: true, nameAr: true, nameEn: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, sku: true, unit: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchaseOrder;
  }

  async create(dto: CreatePurchaseOrderDto, tenantId: string, userId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found');
      }
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
      });
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
    }

    const orderNumber = await this.generateOrderNumber(tenantId);

    let totalAmount = 0;
    for (const item of dto.items) {
      totalAmount += item.quantity * item.unitPrice;
    }

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: dto.supplierId,
        branchId: dto.branchId || null,
        warehouseId: dto.warehouseId || null,
        orderNumber,
        status: 'DRAFT',
        totalAmount,
        notes: dto.notes,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        createdById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, sku: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
    });

    await this.invalidatePOCache(tenantId);
    this.logger.log(`Purchase order created: ${purchaseOrder.orderNumber}`);
    return purchaseOrder;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, tenantId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== 'DRAFT') {
      throw new BadRequestException('Only draft purchase orders can be updated');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.expectedDate !== undefined) updateData.expectedDate = dto.expectedDate ? new Date(dto.expectedDate) : null;
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId;
    if (dto.warehouseId !== undefined) updateData.warehouseId = dto.warehouseId;

    if (dto.items) {
      let totalAmount = 0;
      for (const item of dto.items) {
        totalAmount += item.quantity * item.unitPrice;
      }
      updateData.totalAmount = totalAmount;

      await this.prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      await this.prisma.purchaseOrderItem.createMany({
        data: dto.items.map((item) => ({
          purchaseOrderId: id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      });
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, sku: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
    });

    await this.invalidatePOCache(tenantId);
    this.logger.log(`Purchase order updated: ${updated.orderNumber}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== 'DRAFT') {
      throw new BadRequestException('Only draft purchase orders can be deleted');
    }

    await this.prisma.purchaseOrder.delete({ where: { id } });

    await this.invalidatePOCache(tenantId);
    this.logger.log(`Purchase order deleted: ${purchaseOrder.orderNumber}`);
    return { message: 'Purchase order deleted successfully' };
  }

  async changeStatus(
    id: string,
    dto: ChangeStatusDto,
    tenantId: string,
    userId: string,
  ) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    this.validateStatusTransition(purchaseOrder.status, dto.status);

    const updateData: Record<string, unknown> = { status: dto.status };

    if (dto.status === 'APPROVED') {
      updateData.approvedById = userId;
    }

    if (dto.status === 'RECEIVED') {
      updateData.receivedDate = new Date();

      const result = await this.prisma.$transaction(async (tx) => {
        for (const item of purchaseOrder.items) {
          const existingStock = await tx.stockLevel.findFirst({
            where: {
              warehouseId: purchaseOrder.warehouseId!,
              productId: item.productId,
              variantId: item.variantId || null,
            },
          });

          if (existingStock) {
            await tx.stockLevel.update({
              where: { id: existingStock.id },
              data: { quantity: { increment: item.quantity } },
            });
          } else {
            if (!purchaseOrder.warehouseId) {
              throw new BadRequestException('Warehouse is required to receive stock');
            }
            await tx.stockLevel.create({
              data: {
                tenantId,
                warehouseId: purchaseOrder.warehouseId,
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
              },
            });
          }

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              warehouseId: purchaseOrder.warehouseId!,
              productId: item.productId,
              variantId: item.variantId || null,
              type: 'IN',
              quantity: item.quantity,
              previousQuantity: existingStock ? existingStock.quantity : 0,
              newQuantity: (existingStock ? existingStock.quantity : 0) + item.quantity,
              referenceType: 'PURCHASE_ORDER',
              referenceId: purchaseOrder.id,
              note: `Received from PO ${purchaseOrder.orderNumber}`,
            },
          });

          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { receivedQuantity: item.quantity },
          });
        }

        const supplierBefore = await tx.supplier.findUnique({
          where: { id: purchaseOrder.supplierId },
        });

        const balanceBefore = Number(supplierBefore!.balance);
        const balanceAfter = balanceBefore + Number(purchaseOrder.totalAmount);

        await tx.supplier.update({
          where: { id: purchaseOrder.supplierId },
          data: { balance: { increment: purchaseOrder.totalAmount } },
        });

        await tx.supplierLedger.create({
          data: {
            tenantId,
            supplierId: purchaseOrder.supplierId,
            type: 'PURCHASE',
            amount: purchaseOrder.totalAmount,
            balanceBefore,
            balanceAfter,
            referenceType: 'PURCHASE_ORDER',
            referenceId: purchaseOrder.id,
            note: `PO ${purchaseOrder.orderNumber} received`,
          },
        });

        const updated = await tx.purchaseOrder.update({
          where: { id },
          data: updateData,
          include: {
            supplier: { select: { id: true, name: true } },
            items: {
              include: {
                product: { select: { id: true, nameAr: true, nameEn: true, sku: true } },
                variant: { select: { id: true, name: true } },
              },
            },
          },
        });

        return updated;
      });

      await this.invalidatePOCache(tenantId);
      this.logger.log(`Purchase order received: ${purchaseOrder.orderNumber}`);
      return result;
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, sku: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
    });

    await this.invalidatePOCache(tenantId);
    this.logger.log(`Purchase order status changed: ${purchaseOrder.orderNumber} -> ${dto.status}`);
    return updated;
  }

  validateStatusTransition(currentStatus: string, newStatus: string): void {
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed) {
      throw new BadRequestException(`Unknown status: ${currentStatus}`);
    }

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const lastPO = await this.prisma.purchaseOrder.findFirst({
      where: {
        tenantId,
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let sequence = 1;
    if (lastPO) {
      const lastSeq = parseInt(lastPO.orderNumber.split('-')[2], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  private async invalidatePOCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}