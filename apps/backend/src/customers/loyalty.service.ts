import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateLoyaltyConfigDto } from './dto/update-loyalty-config.dto';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';

const CACHE_TTL = 3600;
const CACHE_PREFIX = 'loyalty';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getConfig(tenantId: string) {
    const cacheKey = `${CACHE_PREFIX}:config:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let config = await this.prisma.loyaltyConfig.findFirst({
      where: { tenantId },
    });

    if (!config) {
      config = await this.prisma.loyaltyConfig.create({
        data: {
          tenantId,
          pointsPerCurrency: 1,
          redemptionRate: 100,
          minimumPointsToRedeem: 100,
          pointsExpiryDays: 365,
          isActive: true,
        },
      });
    }

    await this.redis.set(cacheKey, JSON.stringify(config), CACHE_TTL);
    return config;
  }

  async updateConfig(dto: UpdateLoyaltyConfigDto, tenantId: string) {
    let config = await this.prisma.loyaltyConfig.findFirst({
      where: { tenantId },
    });

    if (!config) {
      config = await this.prisma.loyaltyConfig.create({
        data: {
          tenantId,
          pointsPerCurrency: dto.pointsPerCurrency ?? 1,
          redemptionRate: dto.redemptionRate ?? 100,
          minimumPointsToRedeem: dto.minimumPointsToRedeem ?? 100,
          pointsExpiryDays: dto.pointsExpiryDays ?? 365,
          isActive: dto.isActive ?? true,
        },
      });
    } else {
      const updateData: Record<string, unknown> = {};
      if (dto.pointsPerCurrency !== undefined) updateData.pointsPerCurrency = dto.pointsPerCurrency;
      if (dto.redemptionRate !== undefined) updateData.redemptionRate = dto.redemptionRate;
      if (dto.minimumPointsToRedeem !== undefined) updateData.minimumPointsToRedeem = dto.minimumPointsToRedeem;
      if (dto.pointsExpiryDays !== undefined) updateData.pointsExpiryDays = dto.pointsExpiryDays;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      config = await this.prisma.loyaltyConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    }

    await this.redis.del(`${CACHE_PREFIX}:config:${tenantId}`);
    this.logger.log(`Loyalty config updated for tenant: ${tenantId}`);
    return config;
  }

  async earnPoints(dto: EarnPointsDto, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.points <= 0) {
      throw new BadRequestException('Points must be greater than zero');
    }

    const [updatedCustomer, transaction] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { loyaltyPoints: { increment: dto.points } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          type: 'EARNED',
          points: dto.points,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      }),
    ]);

    this.logger.log(`Earned ${dto.points} points for customer: ${customer.name}`);
    return {
      transaction,
      customerBalance: updatedCustomer.loyaltyPoints,
    };
  }

  async redeemPoints(dto: RedeemPointsDto, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const config = await this.getConfig(tenantId);

    if (!config.isActive) {
      throw new BadRequestException('Loyalty program is not active');
    }

    if (dto.points <= 0) {
      throw new BadRequestException('Points to redeem must be greater than zero');
    }

    if (customer.loyaltyPoints < dto.points) {
      throw new BadRequestException(
        `Insufficient points. Customer has ${customer.loyaltyPoints} points but requested ${dto.points}`,
      );
    }

    if (dto.points < config.minimumPointsToRedeem) {
      throw new BadRequestException(
        `Minimum points to redeem is ${config.minimumPointsToRedeem}. Requested: ${dto.points}`,
      );
    }

    const [updatedCustomer, transaction] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { loyaltyPoints: { decrement: dto.points } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          type: 'REDEEMED',
          points: dto.points,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          note: dto.note,
        },
      }),
    ]);

    const redemptionValue = dto.points / config.redemptionRate;

    this.logger.log(
      `Redeemed ${dto.points} points (value: ${redemptionValue}) for customer: ${customer.name}`,
    );

    return {
      transaction,
      customerBalance: updatedCustomer.loyaltyPoints,
      redemptionValue: Math.round(redemptionValue * 100) / 100,
    };
  }

  calculatePoints(amount: number, tenantId: string): Promise<number> {
    const points = Math.floor(amount * 1);
    return Promise.resolve(points);
  }

  async calculatePointsFromConfig(amount: number, tenantId: string): Promise<number> {
    const config = await this.getConfig(tenantId);
    if (!config.isActive) return 0;
    return Math.floor(amount * config.pointsPerCurrency);
  }
}