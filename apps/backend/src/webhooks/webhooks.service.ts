import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateHmacSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  async findAll(tenantId: string) {
    const webhooks = await this.prisma.webhookEndpoint.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: webhooks.map((w) => ({
        ...w,
        secret: this.maskSecret(w.secret),
      })),
      total: webhooks.length,
    };
  }

  async findById(id: string, tenantId: string) {
    const webhook = await this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return {
      ...webhook,
      secret: this.maskSecret(webhook.secret),
    };
  }

  async create(dto: CreateWebhookDto, tenantId: string) {
    const secret = this.generateSecret();

    const webhook = await this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: dto.url,
        secret,
        events: dto.events as never,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Webhook created: ${webhook.id} -> ${dto.url}`);

    return {
      ...webhook,
      secret,
      message: 'Store this secret securely. It will not be shown again.',
    };
  }

  async update(
    id: string,
    dto: Partial<CreateWebhookDto>,
    tenantId: string,
  ) {
    const webhook = await this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.url !== undefined) updateData.url = dto.url;
    if (dto.events !== undefined) updateData.events = dto.events as never;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Webhook updated: ${updated.id}`);
    return {
      ...updated,
      secret: this.maskSecret(updated.secret),
    };
  }

  async remove(id: string, tenantId: string) {
    const webhook = await this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.webhookEndpoint.delete({ where: { id } });
    this.logger.log(`Webhook deleted: ${webhook.id}`);
    return { message: 'Webhook deleted successfully' };
  }

  async triggerWebhook(id: string, tenantId: string) {
    const webhook = await this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const payload = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId,
      events: webhook.events,
      type: 'webhook.test',
      data: {
        message: 'This is a test webhook trigger',
        triggeredAt: new Date().toISOString(),
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateHmacSignature(payloadString, webhook.secret);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Id': payload.id,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');

      await this.prisma.webhookEndpoint.update({
        where: { id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: response.ok ? 0 : webhook.failureCount + 1,
        },
      });

      this.logger.log(
        `Webhook ${id} triggered -> ${response.status} ${response.statusText}`,
      );

      return {
        webhookId: id,
        url: webhook.url,
        statusCode: response.status,
        statusText: response.statusText,
        responseBody: responseBody.substring(0, 500),
        success: response.ok,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.prisma.webhookEndpoint.update({
        where: { id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: webhook.failureCount + 1,
        },
      });

      this.logger.error(
        `Webhook ${id} trigger failed: ${(error as Error).message}`,
      );

      return {
        webhookId: id,
        url: webhook.url,
        error: (error as Error).message,
        success: false,
        failureCount: webhook.failureCount + 1,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async toggleActive(id: string, tenantId: string) {
    const webhook = await this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const updated = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: { isActive: !webhook.isActive },
    });

    this.logger.log(
      `Webhook ${updated.isActive ? 'activated' : 'deactivated'}: ${updated.id}`,
    );

    return {
      ...updated,
      secret: this.maskSecret(updated.secret),
    };
  }

  private maskSecret(secret: string): string {
    if (secret.length <= 8) return '****';
    return `${secret.substring(0, 8)}...${secret.substring(secret.length - 4)}`;
  }
}