import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCouponDto, ValidateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

const CACHE_TTL = 300;
const CACHE_PREFIX = 'coupons';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
      expired?: boolean;
    },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [{ code: { contains: query.search } }];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.expired !== undefined) {
      const now = new Date();
      if (query.expired) {
        where.endDate = { lt: now };
      } else {
        where.endDate = { gte: now };
      }
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { usages: true } },
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
        usages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            invoice: { select: { id: true, invoiceNumber: true, grandTotal: true } },
          },
        },
        _count: { select: { usages: true } },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async create(dto: CreateCouponDto, tenantId: string, userId: string) {
    const existing = await this.prisma.coupon.findFirst({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('A coupon with this code already exists');
    }

    if (dto.type === 'PERCENTAGE' && dto.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxUses: dto.maxUses,
        maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
        customerId: dto.customerId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById: userId,
        currentUses: 0,
        isActive: true,
      },
    });

    await this.invalidateCache(tenantId);
    this.logger.log(`Coupon created: ${coupon.code}`);
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (dto.code && dto.code !== coupon.code) {
      const existing = await this.prisma.coupon.findFirst({
        where: { code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A coupon with this code already exists');
      }
    }

    if (dto.type === 'PERCENTAGE' && dto.value !== undefined && dto.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.code !== undefined) updateData.code = dto.code.toUpperCase();
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.value !== undefined) updateData.value = dto.value;
    if (dto.minOrderAmount !== undefined) updateData.minOrderAmount = dto.minOrderAmount;
    if (dto.maxUses !== undefined) updateData.maxUses = dto.maxUses;
    if (dto.maxUsesPerCustomer !== undefined) updateData.maxUsesPerCustomer = dto.maxUsesPerCustomer;
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    await this.invalidateCache(tenantId);
    this.logger.log(`Coupon updated: ${updated.code}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.coupon.delete({ where: { id } });
    await this.invalidateCache(tenantId);
    this.logger.log(`Coupon deleted: ${coupon.code}`);
    return { message: 'Coupon deleted successfully' };
  }

  async toggleActive(id: string, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });

    await this.invalidateCache(tenantId);
    return updated;
  }

  async validateCoupon(dto: ValidateCouponDto, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: dto.code.toUpperCase(), tenantId },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active');
    }

    const now = new Date();
    if (now < coupon.startDate) {
      throw new BadRequestException('Coupon has not started yet');
    }
    if (now > coupon.endDate) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    if (dto.orderAmount < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount of ${coupon.minOrderAmount} is required`,
      );
    }

    if (coupon.customerId && dto.customerId && coupon.customerId !== dto.customerId) {
      throw new BadRequestException('This coupon is not valid for this customer');
    }

    if (dto.customerId) {
      const usageCount = await this.prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          customerId: dto.customerId,
        },
      });

      if (usageCount >= coupon.maxUsesPerCustomer) {
        throw new BadRequestException(
          'You have reached the maximum usage limit for this coupon',
        );
      }
    }

    const discountAmount = this.calculateDiscount(
      coupon.type,
      coupon.value,
      dto.orderAmount,
    );

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderAmount: Number(coupon.minOrderAmount),
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round((dto.orderAmount - discountAmount) * 100) / 100,
    };
  }

  async recordUsage(
    couponId: string,
    customerId: string,
    invoiceId: string,
    discountAmount: number,
    tenantId: string,
  ) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, tenantId },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.couponUsage.create({
      data: {
        couponId,
        customerId,
        invoiceId,
        discountAmount,
      },
    });

    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { currentUses: { increment: 1 } },
    });

    await this.invalidateCache(tenantId);
  }

  private calculateDiscount(
    type: string,
    value: number,
    orderAmount: number,
  ): number {
    if (type === 'PERCENTAGE') {
      return (orderAmount * value) / 100;
    }
    return Math.min(value, orderAmount);
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}