import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'products';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: ProductQueryDto, tenantId: string) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const cacheKey = `${CACHE_PREFIX}:list:${tenantId}:${page}:${limit}:${query.search || ''}:${query.categoryId || ''}:${query.isActive ?? ''}:${query.hasExpiry ?? ''}:${sortBy}:${sortOrder}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where: Record<string, unknown> = { tenantId };
    if (query.search) {
      where.OR = [
        { nameAr: { contains: query.search } },
        { nameEn: { contains: query.search } },
        { sku: { contains: query.search } },
        { barcode: { contains: query.search } },
      ];
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.hasExpiry !== undefined) {
      where.hasExpiry = query.hasExpiry;
    }
    if (query.isQuickKey !== undefined) {
      where.isQuickKey = query.isQuickKey;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, nameAr: true, nameEn: true } },
          stockLevels: { select: { quantity: true, warehouseId: true } },
          _count: { select: { variants: true, stockLevels: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const mappedProducts = products.map((p) => {
      const stock = p.stockLevels?.reduce((sum, sl) => sum + (Number(sl.quantity) || 0), 0) ?? 0;
      return {
        ...p,
        stock,
      };
    });

    const result = {
      data: mappedProducts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async findById(id: string, tenantId: string) {
    const cacheKey = `${CACHE_PREFIX}:detail:${tenantId}:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
        units: true,
        variants: {
          include: { options: true },
        },
        productPrices: {
          include: { priceList: { select: { id: true, nameAr: true, nameEn: true, type: true } } },
        },
        stockLevels: {
          include: { warehouse: { select: { id: true, nameAr: true, nameEn: true, code: true } } },
        },
        compositeItems: {
          include: {
            componentProduct: {
              select: { id: true, nameAr: true, nameEn: true, sku: true, sellingPrice: true },
            },
          },
        },
        componentOf: {
          include: {
            product: {
              select: { id: true, nameAr: true, nameEn: true, sku: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const stock = product.stockLevels?.reduce((sum, sl) => sum + (Number(sl.quantity) || 0), 0) ?? 0;
    const result = {
      ...product,
      stock,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async create(dto: CreateProductDto, tenantId: string) {
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const sku = dto.sku || await this.generateSku(tenantId);

    const existingSku = await this.prisma.product.findFirst({
      where: { sku, tenantId },
    });
    if (existingSku) {
      throw new ConflictException('SKU already exists');
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, tenantId },
      });
      if (existingBarcode) {
        throw new ConflictException('Barcode already exists');
      }
    }

    const barcode = dto.barcode || this.generateBarcode();

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        categoryId: dto.categoryId || null,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        descriptionAr: dto.descriptionAr,
        descriptionEn: dto.descriptionEn,
        sku,
        barcode,
        image: dto.image,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        unit: dto.unit,
        hasExpiry: dto.hasExpiry || false,
        expiryDays: dto.expiryDays,
        isComposite: dto.isComposite || false,
        lowStockAlert: dto.lowStockAlert ?? 5,
        units: dto.units?.length
          ? {
              create: dto.units.map((u) => ({
                unitName: u.unitName,
                conversionRate: u.conversionRate,
                barcode: u.barcode,
                sellingPrice: u.sellingPrice,
                isDefault: u.isDefault || false,
              })),
            }
          : undefined,
        variants: dto.variants?.length
          ? {
              create: dto.variants.map((v) => ({
                name: v.name,
                sku: v.sku || `${sku}-${v.name.replace(/\s+/g, '-').toUpperCase()}`,
                barcode: v.barcode,
                costPrice: v.costPrice,
                sellingPrice: v.sellingPrice,
                options: v.options?.length
                  ? {
                      create: v.options.map((o) => ({
                        name: o.name,
                        value: o.value,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
        compositeItems: dto.isComposite && dto.compositeProductIds?.length
          ? {
              create: dto.compositeProductIds.map((componentProductId, idx) => ({
                componentProductId,
                quantity: dto.compositeQuantities?.[idx] ?? 1,
              })),
            }
          : undefined,
      },
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true } },
        units: true,
        variants: { include: { options: true } },
      },
    });

    await this.invalidateProductCache(tenantId);
    this.logger.log(`Product created: ${product.nameEn} (${product.sku})`);

    return product;
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('SKU already exists');
      }
    }

    if (dto.barcode && dto.barcode !== product.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: dto.barcode, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Barcode already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    const fields = ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn', 'sku', 'barcode', 'image', 'costPrice', 'sellingPrice', 'unit', 'hasExpiry', 'expiryDays', 'isComposite', 'lowStockAlert', 'categoryId'];
    for (const field of fields) {
      if ((dto as any)[field] !== undefined) {
        updateData[field] = (dto as any)[field];
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true } },
        units: true,
        variants: { include: { options: true } },
      },
    });

    await this.invalidateProductCache(tenantId);
    this.logger.log(`Product updated: ${updated.nameEn}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateProductCache(tenantId);
    this.logger.log(`Product soft-deleted: ${product.nameEn}`);
    return { message: 'Product deleted successfully' };
  }

  async bulkImport(products: CreateProductDto[], tenantId: string) {
    const results = { success: 0, failed: 0, errors: [] as { index: number; error: string }[] };

    for (let i = 0; i < products.length; i++) {
      try {
        await this.create(products[i], tenantId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ index: i, error: (error as Error).message });
      }
    }

    await this.invalidateProductCache(tenantId);
    this.logger.log(`Bulk import: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  async quickSearch(query: string, tenantId: string) {
    const cacheKey = `${CACHE_PREFIX}:quicksearch:${tenantId}:${query}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { nameAr: { contains: query } },
          { nameEn: { contains: query } },
          { sku: { contains: query } },
          { barcode: { contains: query } },
        ],
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        sku: true,
        barcode: true,
        sellingPrice: true,
        unit: true,
        image: true,
        isQuickKey: true,
        quickKeyPosition: true,
        category: { select: { id: true, nameAr: true, nameEn: true } },
        variants: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true, barcode: true, sellingPrice: true },
          take: 20,
        },
      },
      take: 50,
    });

    const result = products.map((p) => ({
      ...p,
      displayName: p.nameEn,
      variants: p.variants.map((v) => ({
        ...v,
        displayName: `${p.nameEn} - ${v.name}`,
      })),
    }));

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async toggleActive(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });

    await this.invalidateProductCache(tenantId);
    return { id: updated.id, isActive: updated.isActive };
  }

  async toggleQuickKey(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        isQuickKey: !product.isQuickKey,
        quickKeyPosition: !product.isQuickKey ? (product.quickKeyPosition ?? 0) : null,
      },
    });

    await this.invalidateProductCache(tenantId);
    return { id: updated.id, isQuickKey: updated.isQuickKey, quickKeyPosition: updated.quickKeyPosition };
  }

  async setQuickKeyPosition(id: string, position: number, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.product.findFirst({
      where: { tenantId, quickKeyPosition: position, id: { not: id } },
    });

    if (existing) {
      await this.prisma.product.update({
        where: { id: existing.id },
        data: { quickKeyPosition: null },
      });
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { quickKeyPosition: position, isQuickKey: true },
    });

    await this.invalidateProductCache(tenantId);
    return { id: updated.id, quickKeyPosition: updated.quickKeyPosition };
  }

  private async generateSku(tenantId: string): Promise<string> {
    const count = await this.prisma.product.count({ where: { tenantId } });
    const padded = String(count + 1).padStart(6, '0');
    return `PRD-${padded}`;
  }

  private generateBarcode(): string {
    const random = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    return random;
  }

  private async invalidateProductCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}:*`);
    const quickKeys = await this.redis.keys(`${CACHE_PREFIX}:quicksearch:${tenantId}:*`);
    const allKeys = [...keys, ...quickKeys];
    if (allKeys.length > 0) {
      await this.redis.del(...allKeys);
    }
  }
}