import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'pricelists';

@Injectable()
export class PriceListsService {
  private readonly logger = new Logger(PriceListsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(tenantId: string) {
    const cacheKey = `${CACHE_PREFIX}:all:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const priceLists = await this.prisma.priceList.findMany({
      where: { tenantId },
      include: {
        _count: { select: { prices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = priceLists.map((pl) => ({
      id: pl.id,
      nameAr: pl.nameAr,
      nameEn: pl.nameEn,
      type: pl.type,
      isDefault: pl.isDefault,
      productCount: pl._count.prices,
      createdAt: pl.createdAt,
      updatedAt: pl.updatedAt,
    }));

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async findById(id: string, tenantId: string) {
    const cacheKey = `${CACHE_PREFIX}:detail:${tenantId}:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const priceList = await this.prisma.priceList.findFirst({
      where: { id, tenantId },
      include: {
        prices: {
          include: {
            product: {
              select: { id: true, nameAr: true, nameEn: true, sku: true, barcode: true, sellingPrice: true, unit: true },
            },
          },
          orderBy: { product: { nameEn: 'asc' } },
        },
      },
    });

    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    const result = {
      id: priceList.id,
      nameAr: priceList.nameAr,
      nameEn: priceList.nameEn,
      type: priceList.type,
      isDefault: priceList.isDefault,
      createdAt: priceList.createdAt,
      updatedAt: priceList.updatedAt,
      prices: priceList.prices.map((p) => ({
        id: p.id,
        productId: p.productId,
        price: p.price,
        product: p.product,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async create(dto: CreatePriceListDto, tenantId: string) {
    if (dto.isDefault) {
      const existingDefault = await this.prisma.priceList.findFirst({
        where: { tenantId, isDefault: true },
      });
      if (existingDefault) {
        await this.prisma.priceList.update({
          where: { id: existingDefault.id },
          data: { isDefault: false },
        });
      }
    }

    const priceList = await this.prisma.priceList.create({
      data: {
        tenantId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        type: dto.type,
        isDefault: dto.isDefault || false,
      },
    });

    await this.invalidatePriceListCache(tenantId);
    this.logger.log(`Price list created: ${priceList.nameEn}`);
    return priceList;
  }

  async update(id: string, dto: UpdatePriceListDto, tenantId: string) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id, tenantId },
    });
    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    if (dto.isDefault && !priceList.isDefault) {
      const existingDefault = await this.prisma.priceList.findFirst({
        where: { tenantId, isDefault: true, id: { not: id } },
      });
      if (existingDefault) {
        await this.prisma.priceList.update({
          where: { id: existingDefault.id },
          data: { isDefault: false },
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;

    const updated = await this.prisma.priceList.update({
      where: { id },
      data: updateData,
    });

    await this.invalidatePriceListCache(tenantId);
    this.logger.log(`Price list updated: ${updated.nameEn}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id, tenantId },
    });
    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    await this.prisma.priceList.delete({ where: { id } });

    await this.invalidatePriceListCache(tenantId);
    this.logger.log(`Price list deleted: ${priceList.nameEn}`);
    return { message: 'Price list deleted successfully' };
  }

  async bulkUpdatePrices(
    priceListId: string,
    prices: { productId: string; price: number }[],
    tenantId: string,
  ) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, tenantId },
    });
    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of prices) {
      try {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId, tenantId },
        });
        if (!product) {
          results.failed++;
          results.errors.push(`Product ${item.productId} not found`);
          continue;
        }

        await this.prisma.productPrice.upsert({
          where: {
            priceListId_productId: {
              priceListId,
              productId: item.productId,
            },
          },
          create: {
            priceListId,
            productId: item.productId,
            price: item.price,
          },
          update: {
            price: item.price,
          },
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Product ${item.productId}: ${(error as Error).message}`);
      }
    }

    await this.invalidatePriceListCache(tenantId);
    this.logger.log(`Bulk price update: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  async getProductPrice(priceListId: string, productId: string, tenantId: string) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id: priceListId, tenantId },
    });
    if (!priceList) {
      throw new NotFoundException('Price list not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const productPrice = await this.prisma.productPrice.findUnique({
      where: {
        priceListId_productId: {
          priceListId,
          productId,
        },
      },
    });

    return {
      priceListId,
      priceListName: priceList.nameEn,
      productId,
      productName: product.nameEn,
      productSku: product.sku,
      defaultSellingPrice: product.sellingPrice,
      priceListPrice: productPrice?.price || null,
    };
  }

  private async invalidatePriceListCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}