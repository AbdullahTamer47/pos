import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  generateSecureKey(): string {
    const prefix = 'sk';
    const random = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${random}`;
  }

  hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  maskKey(key: string): string {
    if (key.length <= 12) return '****';
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  async findAll(tenantId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      data: keys.map((k) => ({
        ...k,
        key: this.maskKey(k.key),
      })),
      total: keys.length,
    };
  }

  async create(dto: CreateApiKeyDto, tenantId: string, userId: string) {
    const rawKey = this.generateSecureKey();
    const hashedKey = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name,
        key: hashedKey,
        permissions: dto.permissions as never,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`API key created: ${apiKey.name} by user ${userId}`);

    return {
      ...apiKey,
      key: this.maskKey(apiKey.key),
      rawKey,
      message: 'Store this key securely. It will not be shown again.',
    };
  }

  async update(
    id: string,
    dto: Partial<CreateApiKeyDto>,
    tenantId: string,
  ) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions as never;
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`API key updated: ${updated.id}`);
    return {
      ...updated,
      key: this.maskKey(updated.key),
    };
  }

  async remove(id: string, tenantId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id } });
    this.logger.log(`API key deleted: ${apiKey.id}`);
    return { message: 'API key deleted successfully' };
  }

  async regenerate(id: string, tenantId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const rawKey = this.generateSecureKey();
    const hashedKey = this.hashKey(rawKey);

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { key: hashedKey },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`API key regenerated: ${updated.id}`);
    return {
      ...updated,
      key: this.maskKey(updated.key),
      rawKey,
      message: 'Store this new key securely. It will not be shown again.',
    };
  }

  async toggleActive(id: string, tenantId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: !apiKey.isActive },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`API key ${updated.isActive ? 'activated' : 'deactivated'}: ${updated.id}`);
    return {
      ...updated,
      key: this.maskKey(updated.key),
    };
  }

  async validateKey(hashedKey: string, tenantId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        tenantId,
        key: hashedKey,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!apiKey) {
      return null;
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }
}