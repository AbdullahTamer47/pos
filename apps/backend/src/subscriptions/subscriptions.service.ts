import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAllPlans(query: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'sortOrder';
    const sortOrder = query.sortOrder || 'asc';

    const where: Record<string, unknown> = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [plans, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    return {
      data: plans,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async createPlan(dto: CreatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        descriptionAr: dto.descriptionAr,
        descriptionEn: dto.descriptionEn,
        maxBranches: dto.maxBranches,
        maxCashiers: dto.maxCashiers,
        maxProducts: dto.maxProducts,
        maxInvoicesPerMonth: dto.maxInvoicesPerMonth,
        durationDays: dto.durationDays,
        price: dto.price,
        features: dto.features ? (typeof dto.features === 'string' ? dto.features : JSON.stringify(dto.features)) : JSON.stringify({}),
        interval: dto.interval,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    this.logger.log(`Plan created: ${plan.nameEn}`);

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.descriptionAr !== undefined && { descriptionAr: dto.descriptionAr }),
        ...(dto.descriptionEn !== undefined && { descriptionEn: dto.descriptionEn }),
        ...(dto.maxBranches !== undefined && { maxBranches: dto.maxBranches }),
        ...(dto.maxCashiers !== undefined && { maxCashiers: dto.maxCashiers }),
        ...(dto.maxProducts !== undefined && { maxProducts: dto.maxProducts }),
        ...(dto.maxInvoicesPerMonth !== undefined && { maxInvoicesPerMonth: dto.maxInvoicesPerMonth }),
        ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.features !== undefined && { features: typeof dto.features === 'string' ? dto.features : JSON.stringify(dto.features) }),
        ...(dto.interval !== undefined && { interval: dto.interval }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Plan updated: ${updated.nameEn}`);

    return updated;
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const activeSubscriptions = await this.prisma.subscription.count({
      where: { planId: id, status: { in: ['ACTIVE', 'TRIAL'] } },
    });

    if (activeSubscriptions > 0) {
      throw new ConflictException(
        'Cannot delete plan with active subscriptions. Deactivate the plan instead.',
      );
    }

    await this.prisma.subscriptionPlan.delete({ where: { id } });

    this.logger.log(`Plan deleted: ${plan.nameEn}`);

    return { message: 'Plan deleted successfully' };
  }

  async findAllSubscriptions(tenantId: string, query: {
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              durationDays: true,
              price: true,
              interval: true,
            },
          },
        },
      }),
      this.prisma.subscription.count({ where: { tenantId } }),
    ]);

    return {
      data: subscriptions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCurrentSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      const graceSubscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'TRIAL'] },
          gracePeriodEnd: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      });

      if (graceSubscription) {
        return {
          ...graceSubscription,
          inGracePeriod: true,
          message: 'Subscription is in grace period',
        };
      }

      return {
        hasActiveSubscription: false,
        message: 'No active subscription',
      };
    }

    return {
      ...subscription,
      hasActiveSubscription: true,
    };
  }

  async createSubscription(dto: CreateSubscriptionDto, tenantId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (!plan.isActive) {
      throw new BadRequestException('Plan is not active');
    }

    const existingActive = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: { gte: new Date() },
      },
    });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    if (existingActive) {
      if (existingActive.status === 'TRIAL') {
        await this.prisma.subscription.update({
          where: { id: existingActive.id },
          data: { status: 'CANCELLED' },
        });
      } else {
        throw new BadRequestException(
          'You already have an active subscription. Cancel it first to upgrade.',
        );
      }
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId: dto.planId,
        startDate,
        endDate,
        status: plan.interval === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        amount: plan.price,
        autoRenew: dto.autoRenew !== undefined ? dto.autoRenew : false,
      },
      include: {
        plan: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            durationDays: true,
            price: true,
          },
        },
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        maxBranches: plan.maxBranches,
        maxCashiers: plan.maxCashiers,
        maxProducts: plan.maxProducts,
        maxInvoicesPerMonth: plan.maxInvoicesPerMonth,
      },
    });

    this.logger.log(`Subscription created for tenant ${tenantId}: ${plan.nameEn}`);

    return subscription;
  }

  async cancelSubscription(subscriptionId: string, tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    if (subscription.status === 'EXPIRED') {
      throw new BadRequestException('Subscription is already expired');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Subscription cancelled: ${subscriptionId}`);

    return {
      id: updated.id,
      status: updated.status,
      message: 'Subscription cancelled successfully',
    };
  }

  async renewSubscription(subscriptionId: string, tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'ACTIVE') {
      throw new BadRequestException('Subscription is already active');
    }

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + subscription.plan.durationDays * 24 * 60 * 60 * 1000,
    );

    const renewed = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId: subscription.planId,
        startDate,
        endDate,
        status: subscription.plan.interval === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
        paymentMethod: subscription.paymentMethod,
        amount: subscription.plan.price,
        autoRenew: subscription.autoRenew,
      },
      include: {
        plan: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            durationDays: true,
            price: true,
          },
        },
      },
    });

    this.logger.log(`Subscription renewed for tenant ${tenantId}`);

    return renewed;
  }

  async checkSubscriptionActive(tenantId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        OR: [
          { endDate: { gte: new Date() } },
          { gracePeriodEnd: { gte: new Date() } },
        ],
      },
    });

    return !!subscription;
  }

  async handleGracePeriod(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: { lt: new Date() },
        gracePeriodEnd: null,
      },
    });

    if (subscription) {
      const gracePeriodEnd = new Date(
        subscription.endDate.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { gracePeriodEnd },
      });

      this.logger.log(`Grace period set for tenant ${tenantId} until ${gracePeriodEnd.toISOString()}`);
    }
  }

  async expireGracePeriods() {
    const expiredGrace = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        gracePeriodEnd: { lt: new Date(),
          not: null },
      },
    });

    for (const sub of expiredGrace) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });

      this.logger.log(`Subscription expired for tenant ${sub.tenantId} after grace period`);
    }

    return { expired: expiredGrace.length };
  }
}