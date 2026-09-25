import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CACHE_TTL = 1800;
const CACHE_PREFIX = 'categories';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(tenantId: string) {
    const cacheKey = `${CACHE_PREFIX}:tree:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    const tree = this.buildTree(categories);

    await this.redis.set(cacheKey, JSON.stringify(tree), CACHE_TTL);
    return tree;
  }

  async findById(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
          include: {
            children: true,
            _count: { select: { products: true } },
          },
        },
        parent: { select: { id: true, nameAr: true, nameEn: true } },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(dto: CreateCategoryDto, tenantId: string) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const slug = dto.slug || this.generateSlug(dto.nameEn);

    const existing = await this.prisma.category.findFirst({
      where: { slug, tenantId },
    });
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        tenantId,
        parentId: dto.parentId || null,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        slug,
        image: dto.image,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });

    await this.invalidateCategoryCache(tenantId);
    this.logger.log(`Category created: ${category.nameEn}`);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
      const isDescendant = await this.isDescendant(id, dto.parentId, tenantId);
      if (isDescendant) {
        throw new BadRequestException('Cannot set a descendant as parent');
      }
    }

    const slug = dto.slug || dto.nameEn ? this.generateSlug(dto.nameEn || category.nameEn) : undefined;

    if (slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Category slug already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.nameAr !== undefined) updateData.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (slug !== undefined) updateData.slug = slug;
    if (dto.image !== undefined) updateData.image = dto.image;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });

    await this.invalidateCategoryCache(tenantId);
    this.logger.log(`Category updated: ${updated.nameEn}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.products > 0) {
      throw new BadRequestException(`Cannot delete category with ${category._count.products} products. Reassign products first.`);
    }

    if (category._count.children > 0) {
      throw new BadRequestException(`Cannot delete category with ${category._count.children} subcategories. Remove subcategories first.`);
    }

    await this.prisma.category.delete({ where: { id } });

    await this.invalidateCategoryCache(tenantId);
    this.logger.log(`Category deleted: ${category.nameEn}`);
    return { message: 'Category deleted successfully' };
  }

  async reorder(ids: string[], tenantId: string) {
    const categories = await this.prisma.category.findMany({
      where: { id: { in: ids }, tenantId },
    });

    if (categories.length !== ids.length) {
      throw new BadRequestException('Some categories not found');
    }

    await Promise.all(
      ids.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.invalidateCategoryCache(tenantId);
    this.logger.log(`Categories reordered: ${ids.length} items`);
    return { message: 'Categories reordered successfully' };
  }

  private buildTree(categories: any[]): any[] {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of categories) {
      const node = map.get(cat.id);
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private async isDescendant(categoryId: string, potentialParentId: string, tenantId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({
      where: { id: potentialParentId, tenantId },
      include: { parent: true },
    });

    if (!category) return false;
    if (category.parentId === categoryId) return true;
    if (!category.parentId) return false;

    return this.isDescendant(categoryId, category.parentId, tenantId);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async invalidateCategoryCache(tenantId: string): Promise<void> {
    const keys = await this.redis.keys(`${CACHE_PREFIX}:*:${tenantId}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}