import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { LoyaltyService } from '../customers/loyalty.service';
import { GiftCardsService } from '../customers/gift-cards.service';
import { v4 as uuidv4 } from 'uuid';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'invoices';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly loyaltyService: LoyaltyService,
    private readonly giftCardsService: GiftCardsService,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      customerId?: string;
      branchId?: string;
      paymentStatus?: string;
    },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
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

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, nameAr: true, nameEn: true } },
          cashier: { select: { id: true, name: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, tier: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, sku: true, unit: true } },
            variant: { select: { id: true, name: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        returnInvoice: { select: { id: true, invoiceNumber: true } },
        returnedInvoices: { select: { id: true, invoiceNumber: true, grandTotal: true } },
        couponUsages: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async create(dto: CreateInvoiceDto, tenantId: string, userId: string) {
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);
    const zatcaUuid = uuidv4();

    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const discountAmount = dto.discountAmount || 0;
    const taxAmount = dto.taxAmount || 0;
    const grandTotal = subtotal - discountAmount + taxAmount;

    const payments = dto.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = Math.min(totalPaid, grandTotal);
    const balanceAmount = grandTotal - paidAmount;

    const isQuotation = dto.type === 'QUOTATION' || dto.status === 'QUOTATION';
    const invoiceType = isQuotation ? 'QUOTATION' : (dto.type || 'SALE');
    const invoiceStatus = isQuotation ? 'QUOTATION' : 'COMPLETED';

    let paymentStatus = isQuotation ? 'UNPAID' : 'UNPAID';
    if (!isQuotation) {
      if (paidAmount >= grandTotal) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIAL';
      }
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      if (!isQuotation) {
        for (const item of dto.items) {
          const stockLevel = await tx.stockLevel.findFirst({
            where: {
              tenantId,
              productId: item.productId,
              variantId: item.variantId || null,
            },
          });

          if (!stockLevel || stockLevel.quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${item.productId}. Available: ${stockLevel?.quantity || 0}, Requested: ${item.quantity}`,
            );
          }

          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: { decrement: item.quantity } },
          });

          const newQuantity = stockLevel.quantity - item.quantity;

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              warehouseId: stockLevel.warehouseId,
              productId: item.productId,
              variantId: item.variantId || null,
              type: 'OUT',
              quantity: item.quantity,
              previousQuantity: stockLevel.quantity,
              newQuantity,
              referenceType: 'INVOICE',
              referenceId: 'pending',
              note: `Sale: ${invoiceNumber}`,
            },
          });
        }
      }

      if (dto.couponCode && !isQuotation) {
        const coupon = await tx.coupon.findFirst({
          where: { code: dto.couponCode, tenantId, isActive: true },
        });

        if (!coupon) {
          throw new BadRequestException('Invalid or inactive coupon code');
        }

        if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
          throw new BadRequestException('Coupon usage limit reached');
        }

        if (new Date() < coupon.startDate || new Date() > coupon.endDate) {
          throw new BadRequestException('Coupon is not valid at this time');
        }
      }

      const created = await tx.invoice.create({
        data: {
          tenantId,
          customerId: dto.customerId || null,
          branchId: dto.branchId || null,
          invoiceNumber,
          type: invoiceType,
          status: invoiceStatus,
          subtotal,
          discountAmount,
          taxAmount,
          grandTotal,
          paidAmount: isQuotation ? 0 : paidAmount,
          balanceAmount: isQuotation ? grandTotal : balanceAmount,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerTier: 'REGULAR',
          paymentStatus,
          notes: dto.notes,
          cashierId: userId,
          shiftId: dto.shiftId || null,
          zatcaUuid,
          items: {
            create: dto.items.map((item) => {
              const itemTotal = item.quantity * item.unitPrice;
              const itemDiscount = item.discountAmount || 0;
              const itemTax = item.taxAmount || 0;
              return {
                productId: item.productId,
                variantId: item.variantId || null,
                productName: item.productName || item.productId,
                productSku: item.productSku || '',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent || 0,
                discountAmount: itemDiscount,
                taxRate: item.taxRate || 0,
                taxAmount: itemTax,
                totalPrice: itemTotal - itemDiscount + itemTax,
                costPrice: item.costPrice,
              };
            }),
          },
          payments: payments.length > 0
            ? {
                create: payments.map((p) => ({
                  tenantId,
                  method: p.method,
                  amount: p.amount,
                  referenceNumber: p.referenceNumber,
                  cardType: p.cardType,
                  giftCardCode: p.giftCardCode,
                  note: p.note,
                })),
              }
            : undefined,
        },
        include: {
          items: true,
          payments: true,
          customer: { select: { id: true, name: true } },
        },
      });

      const movementUpdates = tx.inventoryMovement.updateMany({
        where: {
          tenantId,
          referenceType: 'INVOICE',
          referenceId: 'pending',
        },
        data: { referenceId: created.id },
      });

      if (dto.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: dto.customerId },
        });

        if (customer) {
          await tx.customer.update({
            where: { id: dto.customerId },
            data: {
              totalSpent: { increment: grandTotal },
              totalOrders: { increment: 1 },
            },
          });

          if (balanceAmount > 0) {
            const balanceBefore = Number(customer.balance);
            const balanceAfter = balanceBefore + balanceAmount;

            await tx.customerLedger.create({
              data: {
                tenantId,
                customerId: dto.customerId,
                type: 'INVOICE',
                amount: balanceAmount,
                balanceBefore,
                balanceAfter,
                referenceType: 'INVOICE',
                referenceId: created.id,
                note: `Invoice ${invoiceNumber}`,
              },
            });

            await tx.customer.update({
              where: { id: dto.customerId },
              data: { balance: { increment: balanceAmount } },
            });
          }

          const loyaltyPoints = await this.loyaltyService.calculatePointsFromConfig(
            Number(grandTotal),
            tenantId,
          );

          if (loyaltyPoints > 0) {
            await tx.customer.update({
              where: { id: dto.customerId },
              data: { loyaltyPoints: { increment: loyaltyPoints } },
            });

            await tx.loyaltyTransaction.create({
              data: {
                tenantId,
                customerId: dto.customerId,
                type: 'EARNED',
                points: loyaltyPoints,
                referenceType: 'INVOICE',
                referenceId: created.id,
                note: `Points earned from invoice ${invoiceNumber}`,
              },
            });
          }
        }
      }

      if (dto.couponCode && dto.customerId) {
        const coupon = await tx.coupon.findFirst({
          where: { code: dto.couponCode, tenantId },
        });

        if (coupon) {
          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              customerId: dto.customerId,
              invoiceId: created.id,
              discountAmount,
            },
          });

          await tx.coupon.update({
            where: { id: coupon.id },
            data: { currentUses: { increment: 1 } },
          });
        }
      }

      for (const payment of payments) {
        if (payment.method === 'GIFT_CARD' && payment.giftCardCode) {
          const giftCard = await tx.giftCard.findFirst({
            where: { code: payment.giftCardCode, tenantId, isActive: true },
          });

          if (giftCard) {
            await tx.giftCard.update({
              where: { id: giftCard.id },
              data: { currentBalance: { decrement: payment.amount } },
            });
          }
        }

        if (payment.method === 'CREDIT' && dto.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: dto.customerId },
          });

          if (customer) {
            const balanceBefore = Number(customer.balance);
            const balanceAfter = balanceBefore + payment.amount;

            await tx.customerLedger.create({
              data: {
                tenantId,
                customerId: dto.customerId,
                type: 'PAYMENT',
                amount: payment.amount,
                balanceBefore,
                balanceAfter,
                referenceType: 'INVOICE',
                referenceId: created.id,
                note: `Payment for invoice ${invoiceNumber}`,
              },
            });
          }
        }
      }

      return created;
    });

    await this.invalidateInvoiceCache(tenantId);
    this.logger.log(`Invoice created: ${invoiceNumber}`);
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId;

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, sku: true } },
          },
        },
        payments: true,
      },
    });

    await this.invalidateInvoiceCache(tenantId);
    return updated;
  }

  async cancel(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Invoice is already cancelled');
    }

    if (invoice.status === 'REFUNDED') {
      throw new BadRequestException('Invoice is already refunded');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of invoice.items) {
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            variantId: item.variantId || null,
          },
        });

        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: { increment: item.quantity } },
          });

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              warehouseId: stockLevel.warehouseId,
              productId: item.productId,
              variantId: item.variantId || null,
              type: 'IN',
              quantity: item.quantity,
              previousQuantity: stockLevel.quantity,
              newQuantity: stockLevel.quantity + item.quantity,
              referenceType: 'INVOICE',
              referenceId: invoice.id,
              note: `Cancelled invoice ${invoice.invoiceNumber}`,
            },
          });
        }
      }

      if (invoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: invoice.customerId },
        });

        if (customer) {
          if (Number(invoice.balanceAmount) > 0) {
            await tx.customer.update({
              where: { id: invoice.customerId },
              data: { balance: { decrement: invoice.balanceAmount } },
            });
          }

          await tx.customerLedger.create({
            data: {
              tenantId,
              customerId: invoice.customerId,
              type: 'REFUND',
              amount: invoice.balanceAmount,
              balanceBefore: Number(customer.balance),
              balanceAfter: Number(customer.balance) - Number(invoice.balanceAmount),
              referenceType: 'INVOICE',
              referenceId: invoice.id,
              note: `Cancelled invoice ${invoice.invoiceNumber}`,
            },
          });
        }
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
        },
      });

      return updated;
    });

    await this.invalidateInvoiceCache(tenantId);
    this.logger.log(`Invoice cancelled: ${invoice.invoiceNumber}`);
    return { message: 'Invoice cancelled successfully', invoice: result };
  }

  async createReturn(
    id: string,
    items: { productId: string; variantId?: string; quantity: number; unitPrice: number }[],
    tenantId: string,
    userId: string,
  ) {
    const originalInvoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!originalInvoice) {
      throw new NotFoundException('Original invoice not found');
    }

    if (originalInvoice.status !== 'COMPLETED') {
      throw new BadRequestException('Can only return completed invoices');
    }

    if (originalInvoice.isReturned) {
      throw new BadRequestException('Invoice has already been returned');
    }

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const zatcaUuid = uuidv4();

    const returnInvoice = await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            variantId: item.variantId || null,
          },
        });

        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: { increment: item.quantity } },
          });

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              warehouseId: stockLevel.warehouseId,
              productId: item.productId,
              variantId: item.variantId || null,
              type: 'IN',
              quantity: item.quantity,
              previousQuantity: stockLevel.quantity,
              newQuantity: stockLevel.quantity + item.quantity,
              referenceType: 'RETURN_INVOICE',
              referenceId: 'pending',
              note: `Return from invoice ${originalInvoice.invoiceNumber}`,
            },
          });
        }
      }

      const created = await tx.invoice.create({
        data: {
          tenantId,
          customerId: originalInvoice.customerId,
          branchId: originalInvoice.branchId,
          invoiceNumber,
          type: 'RETURN_SALE',
          status: 'COMPLETED',
          subtotal,
          discountAmount: 0,
          taxAmount: 0,
          grandTotal: subtotal,
          paidAmount: subtotal,
          balanceAmount: 0,
          paymentStatus: 'PAID',
          cashierId: userId,
          returnInvoiceId: originalInvoice.id,
          zatcaUuid,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              productName: item.productId,
              productSku: '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              discountPercent: 0,
              discountAmount: 0,
              taxRate: 0,
              taxAmount: 0,
            })),
          },
        },
        include: { items: true },
      });

      await tx.inventoryMovement.updateMany({
        where: {
          tenantId,
          referenceType: 'RETURN_INVOICE',
          referenceId: 'pending',
        },
        data: { referenceId: created.id },
      });

      await tx.invoice.update({
        where: { id: originalInvoice.id },
        data: { isReturned: true },
      });

      if (originalInvoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: originalInvoice.customerId },
        });

        if (customer) {
          const balanceBefore = Number(customer.balance);
          const balanceAfter = balanceBefore - subtotal;

          await tx.customerLedger.create({
            data: {
              tenantId,
              customerId: originalInvoice.customerId,
              type: 'REFUND',
              amount: subtotal,
              balanceBefore,
              balanceAfter,
              referenceType: 'RETURN_INVOICE',
              referenceId: created.id,
              note: `Return from invoice ${originalInvoice.invoiceNumber}`,
            },
          });

          await tx.customer.update({
            where: { id: originalInvoice.customerId },
            data: { balance: { decrement: subtotal } },
          });
        }
      }

      return created;
    });

    await this.invalidateInvoiceCache(tenantId);
    this.logger.log(`Return invoice created: ${invoiceNumber} (from ${originalInvoice.invoiceNumber})`);
    return returnInvoice;
  }

  async hold(dto: CreateInvoiceDto, tenantId: string, userId: string) {
    const hold = await this.prisma.invoiceHold.create({
      data: {
        tenantId,
        cashierId: userId,
        customerId: dto.customerId || null,
        cartData: JSON.stringify(dto),
        holdNote: dto.notes,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Invoice held: ${hold.id}`);
    return hold;
  }

  async listHeld(tenantId: string) {
    const holds = await this.prisma.invoiceHold.findMany({
      where: {
        tenantId,
        isResumed: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        cashier: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return holds;
  }

  async resume(holdId: string, tenantId: string) {
    const hold = await this.prisma.invoiceHold.findFirst({
      where: { id: holdId, tenantId, isResumed: false },
    });

    if (!hold) {
      throw new NotFoundException('Held invoice not found');
    }

    await this.prisma.invoiceHold.update({
      where: { id: holdId },
      data: { isResumed: true },
    });

    let cartData = hold.cartData;
    if (typeof hold.cartData === 'string') {
      try {
        cartData = JSON.parse(hold.cartData);
      } catch {
        cartData = hold.cartData;
      }
    }

    return { message: 'Held invoice resumed', cartData };
  }

  async deleteHold(holdId: string, tenantId: string) {
    const hold = await this.prisma.invoiceHold.findFirst({
      where: { id: holdId, tenantId },
    });

    if (!hold) {
      throw new NotFoundException('Held invoice not found');
    }

    await this.prisma.invoiceHold.delete({ where: { id: holdId } });

    return { message: 'Held invoice deleted successfully' };
  }

  async getLastInvoiceNumber(tenantId: string) {
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    return { lastInvoiceNumber: lastInvoice?.invoiceNumber || null };
  }

  async quickSearch(query: string, tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        OR: [
          { invoiceNumber: { contains: query } },
          { customerName: { contains: query } },
          { customerPhone: { contains: query } },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        status: true,
        grandTotal: true,
        paidAmount: true,
        paymentStatus: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return invoices;
  }

  async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        tenantId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  calculateTotals(items: {
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    taxRate?: number;
  }[]): {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      if (item.discountPercent) {
        discountAmount += itemTotal * (item.discountPercent / 100);
      } else if (item.discountAmount) {
        discountAmount += item.discountAmount;
      }

      const afterDiscount = itemTotal - discountAmount;
      if (item.taxRate) {
        taxAmount += afterDiscount * (item.taxRate / 100);
      }
    }

    const grandTotal = subtotal - discountAmount + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }

  async convertQuotationToSale(
    id: string,
    dto: { payments?: any[]; cashierId?: string; shiftId?: string },
    tenantId: string,
    userId: string,
  ) {
    const quotation = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.status === 'COMPLETED' && quotation.type === 'SALE') {
      return quotation;
    }

    const payments = dto.payments || [{ method: 'CASH', amount: Number(quotation.grandTotal) }];
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const grandTotal = Number(quotation.grandTotal);
    const paidAmount = Math.min(totalPaid, grandTotal);
    const balanceAmount = grandTotal - paidAmount;
    const paymentStatus = paidAmount >= grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const converted = await this.prisma.$transaction(async (tx) => {
      for (const item of quotation.items) {
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            variantId: item.variantId || null,
          },
        });

        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: { decrement: item.quantity } },
          });

          await tx.inventoryMovement.create({
            data: {
              tenantId,
              warehouseId: stockLevel.warehouseId,
              productId: item.productId,
              variantId: item.variantId || null,
              type: 'OUT',
              quantity: item.quantity,
              previousQuantity: stockLevel.quantity,
              newQuantity: stockLevel.quantity - item.quantity,
              referenceType: 'INVOICE',
              referenceId: quotation.id,
              note: `Converted from Quotation: ${quotation.invoiceNumber}`,
            },
          });
        }
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          type: 'SALE',
          status: 'COMPLETED',
          paymentStatus,
          paidAmount,
          balanceAmount,
          cashierId: userId,
          shiftId: dto.shiftId || quotation.shiftId,
        },
        include: { items: true, payments: true, customer: true },
      });

      for (const p of payments) {
        await tx.payment.create({
          data: {
            tenantId,
            invoiceId: quotation.id,
            method: p.method || 'CASH',
            amount: p.amount,
            referenceNumber: p.referenceNumber || null,
            cardType: p.cardType || null,
            giftCardCode: p.giftCardCode || null,
            note: p.note || 'Quotation converted to Sale',
          },
        });
      }

      return updated;
    });

    await this.invalidateInvoiceCache(tenantId);
    this.logger.log(`Quotation converted to sale: ${quotation.invoiceNumber}`);
    return converted;
  }

  private async invalidateInvoiceCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}