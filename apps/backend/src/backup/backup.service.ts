import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('backup') private readonly backupQueue: Queue,
  ) {}

  async findAll(
    query: { page?: number; limit?: number },
    tenantId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [backups, total] = await Promise.all([
      this.prisma.backup.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.backup.count({ where: { tenantId } }),
    ]);

    return {
      data: backups.map((b) => ({
        ...b,
        fileSize: b.fileSize ? Number(b.fileSize) : 0,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, tenantId: string) {
    const backup = await this.prisma.backup.findFirst({
      where: { id, tenantId },
    });

    if (!backup) {
      throw new NotFoundException('Backup record not found');
    }

    return {
      ...backup,
      fileSize: backup.fileSize ? Number(backup.fileSize) : 0,
    };
  }

  async triggerBackup(tenantId: string, userId: string) {
    const inProgress = await this.prisma.backup.findFirst({
      where: { tenantId, status: 'IN_PROGRESS' },
    });

    if (inProgress) {
      throw new BadRequestException('A backup is already in progress');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${tenantId}-${timestamp}.sql`;

    const backup = await this.prisma.backup.create({
      data: {
        tenantId,
        filename,
        fileSize: 0,
        fileUrl: '',
        status: 'PENDING',
        type: 'MANUAL',
      },
    });

    await this.backupQueue.add(
      'generate-backup',
      {
        backupId: backup.id,
        tenantId,
        userId,
        filename,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Backup job enqueued: ${backup.id}`);
    return backup;
  }

  async remove(id: string, tenantId: string) {
    const backup = await this.prisma.backup.findFirst({
      where: { id, tenantId },
    });

    if (!backup) {
      throw new NotFoundException('Backup record not found');
    }

    if (backup.status === 'IN_PROGRESS') {
      throw new BadRequestException('Cannot delete a backup in progress');
    }

    await this.prisma.backup.delete({ where: { id } });
    this.logger.log(`Backup record deleted: ${backup.id}`);
    return { message: 'Backup record deleted successfully' };
  }
}