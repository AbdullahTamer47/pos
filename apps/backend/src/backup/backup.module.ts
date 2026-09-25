import { Module } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { BackupProcessor } from './backup.processor';
import { InMemoryQueue } from '../queues/in-memory-queue';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [BackupController],
  providers: [
    {
      provide: getQueueToken('backup'),
      useFactory: () => new InMemoryQueue('backup'),
    },
    BackupService,
    BackupProcessor,
  ],
  exports: [BackupService],
})
export class BackupModule {}