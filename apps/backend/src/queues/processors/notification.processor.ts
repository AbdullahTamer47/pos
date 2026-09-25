import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationJobData } from '../queues.service';

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(job: Job<NotificationJobData>) {
    const { userId, tenantId, type, titleAr, titleEn, bodyAr, bodyEn, actionUrl, entityType, entityId } = job.data;

    this.logger.log(`Processing notification job ${job.id} for user ${userId}`);

    try {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          type,
          titleAr,
          titleEn,
          bodyAr,
          bodyEn,
          actionUrl: actionUrl || null,
        },
      });

      this.logger.log(`Notification created: ${notification.id} for user ${userId}`);

      return {
        notificationId: notification.id,
        userId,
        type,
        status: 'sent',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}