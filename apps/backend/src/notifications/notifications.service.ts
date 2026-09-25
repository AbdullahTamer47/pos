import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      isRead?: boolean;
      type?: string;
    },
    tenantId: string,
    userId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId, userId };

    if (query.isRead !== undefined) where.isRead = query.isRead;
    if (query.type) where.type = query.type;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async markAsRead(id: string, tenantId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return updated;
  }

  async markAllAsRead(tenantId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user ${userId}`);
    return { message: `${result.count} notifications marked as read` };
  }

  async remove(id: string, tenantId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted successfully' };
  }

  async sendNotification(dto: CreateNotificationDto, tenantId: string) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId,
        type: dto.type,
        titleAr: dto.titleAr,
        titleEn: dto.titleEn,
        bodyAr: dto.bodyAr,
        bodyEn: dto.bodyEn,
        actionUrl: dto.actionUrl,
      },
    });

    if (dto.userId) {
      this.notificationsGateway.sendToUser(dto.userId, 'notification', notification);
    }

    this.logger.log(`Notification sent: ${dto.type} to user ${dto.userId || 'broadcast'}`);
    return notification;
  }

  async sendToUser(userId: string, dto: CreateNotificationDto, tenantId: string) {
    return this.sendNotification({ ...dto, userId }, tenantId);
  }

  async sendToRole(
    role: string,
    dto: CreateNotificationDto,
    tenantId: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role, isActive: true },
      select: { id: true },
    });

    const notifications: Record<string, unknown>[] = [];
    for (const user of users) {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          userId: user.id,
          type: dto.type,
          titleAr: dto.titleAr,
          titleEn: dto.titleEn,
          bodyAr: dto.bodyAr,
          bodyEn: dto.bodyEn,
          actionUrl: dto.actionUrl,
        },
      });
      this.notificationsGateway.sendToUser(user.id, 'notification', notification);
      notifications.push(notification);
    }

    this.logger.log(`Notification sent to role ${role}: ${users.length} users`);
    return { sentTo: users.length, notifications };
  }

  async sendToTenant(
    dto: CreateNotificationDto,
    tenantId: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    const notifications: Record<string, unknown>[] = [];
    for (const user of users) {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          userId: user.id,
          type: dto.type,
          titleAr: dto.titleAr,
          titleEn: dto.titleEn,
          bodyAr: dto.bodyAr,
          bodyEn: dto.bodyEn,
          actionUrl: dto.actionUrl,
        },
      });
      this.notificationsGateway.sendToUser(user.id, 'notification', notification);
      notifications.push(notification);
    }

    this.notificationsGateway.sendToTenant(tenantId, 'broadcast', {
      type: dto.type,
      titleAr: dto.titleAr,
      titleEn: dto.titleEn,
      bodyAr: dto.bodyAr,
      bodyEn: dto.bodyEn,
    });

    this.logger.log(`Broadcast notification sent to tenant ${tenantId}: ${users.length} users`);
    return { sentTo: users.length, notifications };
  }
}