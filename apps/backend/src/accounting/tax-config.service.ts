import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxConfigDto } from './dto/create-tax-config.dto';

@Injectable()
export class TaxConfigService {
  private readonly logger = new Logger(TaxConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const configs = await this.prisma.taxConfig.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      data: configs,
      total: configs.length,
      defaultConfig: configs.find((c) => c.isDefault) || null,
    };
  }

  async findById(id: string, tenantId: string) {
    const config = await this.prisma.taxConfig.findFirst({
      where: { id, tenantId },
    });

    if (!config) {
      throw new NotFoundException('Tax configuration not found');
    }

    return config;
  }

  async getDefault(tenantId: string) {
    const config = await this.prisma.taxConfig.findFirst({
      where: { tenantId, isDefault: true, isActive: true },
    });

    return config || null;
  }

  async create(dto: CreateTaxConfigDto, tenantId: string) {
    if (dto.isDefault) {
      await this.prisma.taxConfig.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await this.prisma.taxConfig.create({
      data: {
        tenantId,
        name: dto.name,
        rate: dto.rate,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        taxNumber: dto.taxNumber,
      },
    });

    this.logger.log(`Tax config created: ${config.name} (${config.rate}%)`);
    return config;
  }

  async update(
    id: string,
    dto: Partial<CreateTaxConfigDto>,
    tenantId: string,
  ) {
    const config = await this.prisma.taxConfig.findFirst({
      where: { id, tenantId },
    });
    if (!config) {
      throw new NotFoundException('Tax configuration not found');
    }

    if (dto.isDefault) {
      await this.prisma.taxConfig.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.rate !== undefined) updateData.rate = dto.rate;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.taxNumber !== undefined) updateData.taxNumber = dto.taxNumber;

    const updated = await this.prisma.taxConfig.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Tax config updated: ${updated.id}`);
    return updated;
  }

  async remove(id: string, tenantId: string) {
    const config = await this.prisma.taxConfig.findFirst({
      where: { id, tenantId },
    });
    if (!config) {
      throw new NotFoundException('Tax configuration not found');
    }

    if (config.isDefault) {
      const nextConfig = await this.prisma.taxConfig.findFirst({
        where: { tenantId, id: { not: id } },
        orderBy: { createdAt: 'desc' },
      });
      if (nextConfig) {
        await this.prisma.taxConfig.update({
          where: { id: nextConfig.id },
          data: { isDefault: true },
        });
      }
    }

    await this.prisma.taxConfig.delete({ where: { id } });
    this.logger.log(`Tax config deleted: ${config.id}`);
    return { message: 'Tax configuration deleted successfully' };
  }

  async toggleDefault(id: string, tenantId: string) {
    const config = await this.prisma.taxConfig.findFirst({
      where: { id, tenantId },
    });
    if (!config) {
      throw new NotFoundException('Tax configuration not found');
    }

    await this.prisma.taxConfig.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.taxConfig.update({
      where: { id },
      data: { isDefault: true },
    });

    this.logger.log(`Tax config set as default: ${updated.id}`);
    return updated;
  }
}