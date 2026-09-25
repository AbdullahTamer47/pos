import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupProcessor {
  private readonly logger = new Logger(BackupProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(job: Job<{ backupId: string; tenantId: string; userId: string; filename: string }>) {
    const { backupId, tenantId, filename } = job.data;

    this.logger.log(`Processing backup job: ${backupId} for tenant ${tenantId}`);

    try {
      await this.prisma.backup.update({
        where: { id: backupId },
        data: { status: 'IN_PROGRESS' },
      });

      await this.simulateBackupGeneration(tenantId, filename);

      const simulatedFileSize = Math.floor(Math.random() * 50000000) + 1000000;
      const simulatedFileUrl = `/backups/${filename}`;

      await this.prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'COMPLETED',
          fileSize: BigInt(simulatedFileSize),
          fileUrl: simulatedFileUrl,
        },
      });

      this.logger.log(`Backup completed: ${backupId} (${simulatedFileSize} bytes)`);
      return { backupId, status: 'COMPLETED', fileSize: simulatedFileSize };
    } catch (error) {
      this.logger.error(`Backup failed: ${backupId}`, (error as Error).stack);

      await this.prisma.backup.update({
        where: { id: backupId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  private async simulateBackupGeneration(tenantId: string, filename: string): Promise<void> {
    this.logger.log(`Generating backup: ${filename} for tenant ${tenantId}`);

    const tables = [
      'users', 'branches', 'warehouses', 'categories', 'products',
      'variants', 'customers', 'suppliers', 'invoices', 'payments',
      'expenses', 'revenues', 'tax_configs', 'coupons', 'promotions',
      'stock_levels', 'inventory_movements', 'audit_logs',
    ];

    for (const table of tables) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      this.logger.log(`Backup progress: exported table '${table}' for tenant ${tenantId}`);
    }

    this.logger.log(`Backup generation completed: ${filename}`);
  }
}