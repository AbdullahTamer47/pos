import { Module } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationProcessor } from './processors/notification.processor';
import { BackupProcessor } from './processors/backup.processor';
import { ReportProcessor } from './processors/report.processor';
import { EmailProcessor } from './processors/email.processor';
import { QueuesService } from './queues.service';
import { InMemoryQueue } from './in-memory-queue';

const queueNames = ['notifications', 'backup', 'reports', 'email', 'sync'];

const queueProviders = queueNames.map((name) => ({
  provide: getQueueToken(name),
  useFactory: () => new InMemoryQueue(name),
}));

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    ...queueProviders,
    NotificationProcessor,
    BackupProcessor,
    ReportProcessor,
    EmailProcessor,
    QueuesService,
  ],
  exports: [...queueProviders, QueuesService],
})
export class QueuesModule {}