import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

const CACHE_TTL = 300;
const CACHE_PREFIX = 'promotions';

interface CartItem {
  productId: string;
  categoryId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PromotionResult {
  promotionId: string;
  promotionName: string;
  type: string;
  discountAmount: number;
  freeItems: Array<{ productId: string; quantity: number }>;
  bundlePrice?: number;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

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
      type?: string;
    },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [
        { nameAr: { contains: query.search } },
        { nameEn: { contains: query.search } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.type) {
      where.type = query.type;
    }

    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      data: promotions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return promotion;
  }

  async create(dto: CreatePromotionDto, tenantId: string) {
    this.validateConfig(dto.type, dto.config);

    const promotion = await this.prisma.promotion.create({
      data: {
        tenantId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        type: dto.type,
        config: typeof dto.config === 'string' ? dto.config : JSON.stringify(dto.config),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: true,
      },
    });

    await this.invalidateCache(tenantId);
    this.logger.log(`Promotion created: ${promotion.nameEn}`);
    return promotion;
  }

  async update(id: string, dto: UpdatePromotionDto, tenantId: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    let existingConfig: Record<string, unknown> = {};
    if (typeof promotion.config === 'string') {
      try {
        existingConfig = JSON.parse(promotion.config) as Record<string, unknown>;
      } catch {
        existingConfig = {};
      }
    }

    const typeToValidate = dto.type || promotion.type;
    const configToValidate = dto.config || existingConfig;
    if (dto.type || dto.config) {
      this.validateConfig(typeToValidate, configToValidate);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.config !== undefined) {
      updateData.config = typeof dto.config === 'string' ? dto.config : JSON.stringify(dto.config);
    }
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: updateData,
    });

    await this.invalidateCache(tenantId);
    this.logger.log(`Promotion updated: ${updated.nameEn}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    await this.prisma.promotion.delete({ where: { id } });
    await this.invalidateCache(tenantId);
    this.logger.log(`Promotion deleted: ${promotion.nameEn}`);
    return { message: 'Promotion deleted successfully' };
  }

  async toggleActive(id: string, tenantId: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: { isActive: !promotion.isActive },
    });

    await this.invalidateCache(tenantId);
    return updated;
  }

  async validatePromotion(id: string, tenantId: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
    });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }
    if (!promotion.isActive) {
      throw new BadRequestException('Promotion is not active');
    }

    const now = new Date();
    if (now < promotion.startDate || now > promotion.endDate) {
      throw new BadRequestException('Promotion is not currently valid');
    }

    return promotion;
  }

  async applyToCart(
    cartItems: CartItem[],
    tenantId: string,
  ): Promise<PromotionResult[]> {
    const activePromotions = await this.prisma.promotion.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const results: PromotionResult[] = [];

    for (const promotion of activePromotions) {
      let config: Record<string, unknown> = {};
      if (typeof promotion.config === 'string') {
        try {
          config = JSON.parse(promotion.config) as Record<string, unknown>;
        } catch {
          config = {};
        }
      }

      if (promotion.type === 'BUY_X_GET_Y') {
        const result = this.applyBuyXGetY(promotion, config, cartItems);
        if (result) results.push(result);
      } else if (promotion.type === 'BUNDLE') {
        const result = this.applyBundle(promotion, config, cartItems);
        if (result) results.push(result);
      } else if (promotion.type === 'DISCOUNT') {
        const result = this.applyDiscount(promotion, config, cartItems);
        if (result) results.push(result);
      }
    }

    return results;
  }

  private applyBuyXGetY(
    promotion: { id: string; nameEn: string },
    config: Record<string, unknown>,
    cartItems: CartItem[],
  ): PromotionResult | null {
    const buyProductId = config.buyProductId as string;
    const buyQuantity = config.buyQuantity as number;
    const getProductId = config.getProductId as string;
    const getQuantity = config.getQuantity as number;
    const discountPercent = (config.discountPercent as number) ?? 100;

    const cartItem = cartItems.find((item) => item.productId === buyProductId);
    if (!cartItem || cartItem.quantity < buyQuantity) return null;

    const freeItem = cartItems.find((item) => item.productId === getProductId);
    const freeItemPrice = freeItem?.unitPrice ?? 0;
    const freeCount = Math.floor(cartItem.quantity / buyQuantity) * getQuantity;
    const discountAmount = (freeItemPrice * freeCount * discountPercent) / 100;

    return {
      promotionId: promotion.id,
      promotionName: promotion.nameEn,
      type: 'BUY_X_GET_Y',
      discountAmount: Math.round(discountAmount * 100) / 100,
      freeItems: [{ productId: getProductId, quantity: freeCount }],
    };
  }

  private applyBundle(
    promotion: { id: string; nameEn: string },
    config: Record<string, unknown>,
    cartItems: CartItem[],
  ): PromotionResult | null {
    const bundleProductId = config.bundleProductId as string;
    const bundlePrice = config.bundlePrice as number;
    const includedProductIds = config.includedProductIds as string[];
    const quantities = config.quantities as number[];

    const hasAll = includedProductIds.every((pid) =>
      cartItems.some((item) => item.productId === pid),
    );
    if (!hasAll) return null;

    const originalTotal = cartItems
      .filter((item) => includedProductIds.includes(item.productId))
      .reduce((sum, item) => sum + item.totalPrice, 0);

    const discountAmount = Math.max(0, originalTotal - bundlePrice);

    return {
      promotionId: promotion.id,
      promotionName: promotion.nameEn,
      type: 'BUNDLE',
      discountAmount: Math.round(discountAmount * 100) / 100,
      freeItems: [],
      bundlePrice,
    };
  }

  private applyDiscount(
    promotion: { id: string; nameEn: string },
    config: Record<string, unknown>,
    cartItems: CartItem[],
  ): PromotionResult | null {
    const discountType = config.discountType as string;
    const discountValue = config.discountValue as number;
    const applicableProductIds = config.applicableProductIds as string[] | undefined;
    const applicableCategoryIds = config.applicableCategoryIds as string[] | undefined;
    const minCartAmount = (config.minCartAmount as number) ?? 0;

    let applicableItems = cartItems;
    if (applicableProductIds?.length) {
      applicableItems = cartItems.filter((item) =>
        applicableProductIds.includes(item.productId),
      );
    }
    if (applicableCategoryIds?.length) {
      applicableItems = applicableItems.filter((item) =>
        applicableCategoryIds.includes(item.categoryId ?? ''),
      );
    }

    const applicableTotal = applicableItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    if (applicableTotal < minCartAmount) return null;

    let discountAmount: number;
    if (discountType === 'PERCENTAGE') {
      discountAmount = (applicableTotal * discountValue) / 100;
    } else {
      discountAmount = Math.min(discountValue, applicableTotal);
    }

    return {
      promotionId: promotion.id,
      promotionName: promotion.nameEn,
      type: 'DISCOUNT',
      discountAmount: Math.round(discountAmount * 100) / 100,
      freeItems: [],
    };
  }

  private validateConfig(
    type: string,
    config: Record<string, unknown>,
  ): void {
    if (type === 'BUY_X_GET_Y') {
      if (!config.buyProductId) throw new BadRequestException('buyProductId is required for BUY_X_GET_Y');
      if (!config.buyQuantity) throw new BadRequestException('buyQuantity is required for BUY_X_GET_Y');
      if (!config.getProductId) throw new BadRequestException('getProductId is required for BUY_X_GET_Y');
      if (!config.getQuantity) throw new BadRequestException('getQuantity is required for BUY_X_GET_Y');
    } else if (type === 'BUNDLE') {
      if (!config.bundleProductId) throw new BadRequestException('bundleProductId is required for BUNDLE');
      if (!config.bundlePrice && config.bundlePrice !== 0) throw new BadRequestException('bundlePrice is required for BUNDLE');
      if (!config.includedProductIds) throw new BadRequestException('includedProductIds is required for BUNDLE');
    } else if (type === 'DISCOUNT') {
      if (!config.discountType) throw new BadRequestException('discountType is required for DISCOUNT');
      if (config.discountValue === undefined) throw new BadRequestException('discountValue is required for DISCOUNT');
    }
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}