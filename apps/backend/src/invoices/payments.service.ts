import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { GiftCardsService } from '../customers/gift-cards.service';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'payments';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly giftCardsService: GiftCardsService,
  ) {}

  async addPayment(
    invoiceId: string,
    dto: CreatePaymentDto,
    tenantId: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
      throw new BadRequestException('Cannot add payment to cancelled or refunded invoice');
    }

    const currentPaid = Number(invoice.paidAmount);
    const newPaid = currentPaid + dto.amount;
    const grandTotal = Number(invoice.grandTotal);

    if (newPaid > grandTotal) {
      throw new BadRequestException(
        `Payment amount exceeds remaining balance. Remaining: ${grandTotal - currentPaid}`,
      );
    }

    const balanceAmount = grandTotal - newPaid;

    let paymentStatus = 'UNPAID';
    if (newPaid >= grandTotal) {
      paymentStatus = 'PAID';
    } else if (newPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      if (dto.method === 'GIFT_CARD' && dto.giftCardCode) {
        const giftCard = await tx.giftCard.findFirst({
          where: { code: dto.giftCardCode, tenantId, isActive: true },
        });

        if (!giftCard) {
          throw new BadRequestException('Gift card not found or inactive');
        }

        if (Number(giftCard.currentBalance) < dto.amount) {
          throw new BadRequestException(
            `Insufficient gift card balance. Available: ${giftCard.currentBalance}, Requested: ${dto.amount}`,
          );
        }

        await tx.giftCard.update({
          where: { id: giftCard.id },
          data: { currentBalance: { decrement: dto.amount } },
        });
      }

      if (dto.method === 'CREDIT' && invoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: invoice.customerId },
        });

        if (customer) {
          const balanceBefore = Number(customer.balance);
          const balanceAfter = balanceBefore + dto.amount;

          await tx.customerLedger.create({
            data: {
              tenantId,
              customerId: invoice.customerId,
              type: 'PAYMENT',
              amount: dto.amount,
              balanceBefore,
              balanceAfter,
              referenceType: 'INVOICE',
              referenceId: invoice.id,
              note: `Payment for invoice ${invoice.invoiceNumber}`,
            },
          });
        }
      }

      const created = await tx.payment.create({
        data: {
          tenantId,
          invoiceId,
          method: dto.method,
          amount: dto.amount,
          referenceNumber: dto.referenceNumber,
          cardType: dto.cardType,
          giftCardCode: dto.giftCardCode,
          note: dto.note,
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaid,
          balanceAmount,
          paymentStatus,
        },
      });

      return created;
    });

    await this.invalidatePaymentCache(tenantId);
    this.logger.log(`Payment added: ${dto.amount} to invoice ${invoice.invoiceNumber}`);
    return payment;
  }

  async listPayments(invoiceId: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: payments,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        grandTotal: invoice.grandTotal,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        paymentStatus: invoice.paymentStatus,
      },
    };
  }

  async deletePayment(paymentId: string, tenantId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const invoice = payment.invoice;
    if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
      throw new BadRequestException('Cannot delete payment from cancelled or refunded invoice');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });

      const remainingPayments = await tx.payment.findMany({
        where: { invoiceId: invoice.id },
      });

      const totalPaid = remainingPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      const grandTotal = Number(invoice.grandTotal);
      const balanceAmount = grandTotal - totalPaid;

      let paymentStatus = 'UNPAID';
      if (totalPaid >= grandTotal) {
        paymentStatus = 'PAID';
      } else if (totalPaid > 0) {
        paymentStatus = 'PARTIAL';
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: totalPaid,
          balanceAmount,
          paymentStatus,
        },
      });

      if (payment.method === 'GIFT_CARD' && payment.giftCardCode) {
        const giftCard = await tx.giftCard.findFirst({
          where: { code: payment.giftCardCode, tenantId },
        });

        if (giftCard) {
          await tx.giftCard.update({
            where: { id: giftCard.id },
            data: { currentBalance: { increment: payment.amount } },
          });
        }
      }

      if (payment.method === 'CREDIT' && invoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: invoice.customerId },
        });

        if (customer) {
          const balanceBefore = Number(customer.balance);
          const balanceAfter = balanceBefore - Number(payment.amount);

          await tx.customerLedger.create({
            data: {
              tenantId,
              customerId: invoice.customerId,
              type: 'REFUND',
              amount: payment.amount,
              balanceBefore,
              balanceAfter,
              referenceType: 'INVOICE',
              referenceId: invoice.id,
              note: `Payment refund for invoice ${invoice.invoiceNumber}`,
            },
          });
        }
      }

      return { message: 'Payment deleted successfully' };
    });

    await this.invalidatePaymentCache(tenantId);
    this.logger.log(`Payment deleted: ${paymentId}`);
    return result;
  }

  private async invalidatePaymentCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}