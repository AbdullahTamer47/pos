import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  private readonly logger = new Logger(VariantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findByProduct(productId: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        options: true,
        stockLevels: {
          include: { warehouse: { select: { id: true, nameAr: true, nameEn: true, code: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return variants;
  }

  async create(productId: string, dto: CreateVariantDto, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sku = dto.sku || `${product.sku}-${dto.name.replace(/\s+/g, '-').toUpperCase()}`;

    const existingSku = await this.prisma.productVariant.findFirst({
      where: { sku },
    });
    if (existingSku) {
      throw new ConflictException('Variant SKU already exists');
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.productVariant.findFirst({
        where: { barcode: dto.barcode },
      });
      if (existingBarcode) {
        throw new ConflictException('Variant barcode already exists');
      }
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        sku,
        barcode: dto.barcode,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        isActive: dto.isActive ?? true,
        options: dto.options?.length
          ? {
              create: dto.options.map((o) => ({
                name: o.name,
                value: o.value,
              })),
            }
          : undefined,
      },
      include: { options: true },
    });

    await this.invalidateProductCache(tenantId, productId);
    this.logger.log(`Variant created: ${variant.name} for product ${product.nameEn}`);
    return variant;
  }

  async update(id: string, dto: UpdateVariantDto, tenantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id },
      include: { product: { select: { tenantId: true } } },
    });

    if (!variant || variant.product.tenantId !== tenantId) {
      throw new NotFoundException('Variant not found');
    }

    if (dto.sku && dto.sku !== variant.sku) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: dto.sku, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Variant SKU already exists');
      }
    }

    if (dto.barcode && dto.barcode !== variant.barcode) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { barcode: dto.barcode, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Variant barcode already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.costPrice !== undefined) updateData.costPrice = dto.costPrice;
    if (dto.sellingPrice !== undefined) updateData.sellingPrice = dto.sellingPrice;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: updateData,
      include: { options: true },
    });

    await this.invalidateProductCache(tenantId, variant.productId);
    this.logger.log(`Variant updated: ${updated.name}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id },
      include: { product: { select: { tenantId: true } } },
    });

    if (!variant || variant.product.tenantId !== tenantId) {
      throw new NotFoundException('Variant not found');
    }

    const stockCount = await this.prisma.stockLevel.count({
      where: { variantId: id, quantity: { gt: 0 } },
    });

    if (stockCount > 0) {
      throw new ConflictException(`Cannot delete variant with stock. Clear inventory first.`);
    }

    await this.prisma.productVariant.delete({ where: { id } });

    await this.invalidateProductCache(tenantId, variant.productId);
    this.logger.log(`Variant deleted: ${variant.name}`);
    return { message: 'Variant deleted successfully' };
  }

  private async invalidateProductCache(tenantId: string, productId: string): Promise<void> {
    const keys = [
      `products:detail:${tenantId}:${productId}`,
      `products:list:${tenantId}:*`,
      `products:quicksearch:${tenantId}:*`,
    ];
    const allKeys: string[] = [];
    for (const pattern of keys) {
      if (pattern.includes('*')) {
        const matched = await this.redis.keys(pattern);
        allKeys.push(...matched);
      } else {
        allKeys.push(pattern);
      }
    }
    if (allKeys.length > 0) {
      await this.redis.del(...allKeys);
    }
  }
}