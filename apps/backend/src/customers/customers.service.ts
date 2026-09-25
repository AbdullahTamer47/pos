import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCustomerDto, CreateCustomerAddressDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'customers';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      tier?: string;
      minPoints?: number;
      maxPoints?: number;
    },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { phone: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    if (query.tier) {
      where.tier = query.tier;
    }
    if (query.minPoints !== undefined) {
      where.loyaltyPoints = { ...(where.loyaltyPoints as object || {}), gte: query.minPoints };
    }
    if (query.maxPoints !== undefined) {
      where.loyaltyPoints = { ...(where.loyaltyPoints as object || {}), lte: query.maxPoints };
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { addresses: true, invoices: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        addresses: true,
        ledgers: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        giftCards: {
          where: { isActive: true },
          select: { id: true, code: true, currentBalance: true, expiryDate: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async create(dto: CreateCustomerDto, tenantId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone, tenantId },
    });
    if (existing) {
      throw new ConflictException('A customer with this phone number already exists');
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        tier: dto.tier || 'REGULAR',
        creditLimit: dto.creditLimit ?? 0,
        notes: dto.notes,
        addresses: dto.addresses?.length
          ? {
              create: dto.addresses.map((a) => ({
                label: a.label,
                address: a.address,
                city: a.city,
                area: a.area,
                postalCode: a.postalCode,
                lat: a.lat,
                lng: a.lng,
                isDefault: a.isDefault || false,
              })),
            }
          : undefined,
      },
      include: { addresses: true },
    });

    await this.invalidateCustomerCache(tenantId);
    this.logger.log(`Customer created: ${customer.name}`);
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A customer with this phone number already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.tier !== undefined) updateData.tier = dto.tier;
    if (dto.creditLimit !== undefined) updateData.creditLimit = dto.creditLimit;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.prisma.customer.update({
      where: { id },
      data: updateData,
      include: { addresses: true },
    });

    await this.invalidateCustomerCache(tenantId);
    this.logger.log(`Customer updated: ${updated.name}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateCustomerCache(tenantId);
    this.logger.log(`Customer soft-deleted: ${customer.name}`);
    return { message: 'Customer deleted successfully' };
  }

  async getLedger(
    customerId: string,
    query: { page?: number; limit?: number },
    tenantId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where = { tenantId, customerId };

    const [entries, total] = await Promise.all([
      this.prisma.customerLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerLedger.count({ where }),
    ]);

    return {
      data: entries,
      customer: { id: customer.id, name: customer.name, balance: customer.balance },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async addPayment(
    customerId: string,
    dto: { amount: number; note?: string; paymentMethod?: string; referenceNumber?: string },
    tenantId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const amount = Number(dto.amount);
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const balanceBefore = Number(customer.balance);
    const balanceAfter = balanceBefore - amount;

    const [ledgerEntry] = await this.prisma.$transaction([
      this.prisma.customerLedger.create({
        data: {
          tenantId,
          customerId,
          type: 'PAYMENT',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'MANUAL_PAYMENT',
          note: dto.note || `Payment received: ${dto.paymentMethod || 'CASH'}${dto.referenceNumber ? ` (${dto.referenceNumber})` : ''}`,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { balance: balanceAfter },
      }),
    ]);

    await this.invalidateCustomerCache(tenantId);
    return {
      message: 'Payment recorded successfully',
      ledgerEntry,
      newBalance: balanceAfter,
    };
  }

  async addAddress(
    customerId: string,
    dto: CreateCustomerAddressDto,
    tenantId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.customerAddress.create({
      data: {
        customerId,
        label: dto.label,
        address: dto.address,
        city: dto.city,
        area: dto.area,
        postalCode: dto.postalCode,
        lat: dto.lat,
        lng: dto.lng,
        isDefault: dto.isDefault || false,
      },
    });

    await this.invalidateCustomerCache(tenantId);
    return address;
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: UpdateAddressDto,
    tenantId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.area !== undefined) updateData.area = dto.area;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.lat !== undefined) updateData.lat = dto.lat;
    if (dto.lng !== undefined) updateData.lng = dto.lng;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: updateData,
    });

    await this.invalidateCustomerCache(tenantId);
    return updated;
  }

  async deleteAddress(
    customerId: string,
    addressId: string,
    tenantId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    await this.invalidateCustomerCache(tenantId);
    return { message: 'Address deleted successfully' };
  }

  async getTransactions(
    customerId: string,
    query: { page?: number; limit?: number },
    tenantId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where = { tenantId, customerId };

    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      loyaltyPoints: customer.loyaltyPoints,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStatistics(customerId: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        customerId,
        status: 'COMPLETED',
        type: 'SALE',
      },
      select: {
        grandTotal: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = invoices.length;
    const totalSpent = invoices.reduce(
      (sum, inv) => sum + Number(inv.grandTotal),
      0,
    );
    const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderDate = totalOrders > 0 ? invoices[0].createdAt : null;

    return {
      totalSpent,
      totalOrders,
      avgOrder: Math.round(avgOrder * 100) / 100,
      lastOrderDate,
      currentBalance: Number(customer.balance),
      loyaltyPoints: customer.loyaltyPoints,
      tier: customer.tier,
    };
  }

  private async invalidateCustomerCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}