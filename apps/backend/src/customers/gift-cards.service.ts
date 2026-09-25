import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';
import { v4 as uuidv4 } from 'uuid';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'giftcards';

@Injectable()
export class GiftCardsService {
  private readonly logger = new Logger(GiftCardsService.name);

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
    },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.code = { contains: query.search.toUpperCase() };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [giftCards, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          soldBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.giftCard.count({ where }),
    ]);

    return {
      data: giftCards,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const giftCard = await this.prisma.giftCard.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        soldBy: { select: { id: true, name: true } },
      },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    return giftCard;
  }

  async create(dto: CreateGiftCardDto, tenantId: string, userId: string) {
    const code = await this.generateGiftCardCode();

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    const giftCard = await this.prisma.giftCard.create({
      data: {
        tenantId,
        code,
        initialBalance: dto.initialBalance,
        currentBalance: dto.initialBalance,
        customerId: dto.customerId || null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        soldById: userId,
        isActive: true,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        soldBy: { select: { id: true, name: true } },
      },
    });

    await this.invalidateGiftCardCache(tenantId);
    this.logger.log(`Gift card created: ${giftCard.code}`);
    return giftCard;
  }

  async update(id: string, dto: UpdateGiftCardDto, tenantId: string) {
    const giftCard = await this.prisma.giftCard.findFirst({
      where: { id, tenantId },
    });
    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.expiryDate !== undefined) updateData.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.giftCard.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        soldBy: { select: { id: true, name: true } },
      },
    });

    await this.invalidateGiftCardCache(tenantId);
    this.logger.log(`Gift card updated: ${updated.code}`);
    return updated;
  }

  async deactivate(id: string, tenantId: string) {
    const giftCard = await this.prisma.giftCard.findFirst({
      where: { id, tenantId },
    });
    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    const updated = await this.prisma.giftCard.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateGiftCardCache(tenantId);
    this.logger.log(`Gift card deactivated: ${updated.code}`);
    return { message: 'Gift card deactivated successfully', code: updated.code };
  }

  async validate(code: string, tenantId: string) {
    const giftCard = await this.prisma.giftCard.findFirst({
      where: { code: code.toUpperCase(), tenantId },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    if (!giftCard.isActive) {
      throw new BadRequestException('Gift card is not active');
    }

    if (giftCard.expiryDate && new Date(giftCard.expiryDate) < new Date()) {
      throw new BadRequestException('Gift card has expired');
    }

    if (Number(giftCard.currentBalance) <= 0) {
      throw new BadRequestException('Gift card has no remaining balance');
    }

    return {
      valid: true,
      code: giftCard.code,
      currentBalance: Number(giftCard.currentBalance),
      expiryDate: giftCard.expiryDate,
    };
  }

  async deduct(id: string, amount: number, tenantId: string) {
    const giftCard = await this.prisma.giftCard.findFirst({
      where: { id, tenantId },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    if (!giftCard.isActive) {
      throw new BadRequestException('Gift card is not active');
    }

    if (Number(giftCard.currentBalance) < amount) {
      throw new BadRequestException(
        `Insufficient gift card balance. Available: ${giftCard.currentBalance}, Requested: ${amount}`,
      );
    }

    const updated = await this.prisma.giftCard.update({
      where: { id },
      data: { currentBalance: { decrement: amount } },
    });

    this.logger.log(`Deducted ${amount} from gift card ${giftCard.code}. Remaining: ${updated.currentBalance}`);
    return updated;
  }

  private async generateGiftCardCode(): Promise<string> {
    const prefix = 'GC';
    const randomPart = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const code = `${prefix}-${randomPart}`;

    const existing = await this.prisma.giftCard.findUnique({
      where: { code },
    });

    if (existing) {
      return this.generateGiftCardCode();
    }

    return code;
  }

  private async invalidateGiftCardCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}