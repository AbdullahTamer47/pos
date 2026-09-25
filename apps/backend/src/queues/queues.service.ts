import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

export interface NotificationJobData {
  userId: string;
  tenantId: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
}

export interface BackupJobData {
  backupId: string;
  tenantId: string;
  userId: string;
  filename: string;
  type: 'MANUAL' | 'AUTOMATIC';
}

export interface ReportJobData {
  reportId: string;
  tenantId: string;
  userId: string;
  reportType: string;
  format: 'pdf' | 'csv' | 'json' | 'excel';
  params: Record<string, unknown>;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  tenantId: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export interface SyncJobData {
  tenantId: string;
  entity: string;
  action: 'push' | 'pull' | 'sync';
  data?: unknown;
  branchId?: string;
}

export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
    @InjectQueue('backup') private readonly backupQueue: Queue,
    @InjectQueue('reports') private readonly reportQueue: Queue,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('sync') private readonly syncQueue: Queue,
  ) {}

  async addNotificationJob(data: NotificationJobData, opts?: { delay?: number }): Promise<Job> {
    const job = await this.notificationQueue.add('send-notification', data, {
      delay: opts?.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log(`Notification job added: ${job.id} for user ${data.userId}`);
    return job;
  }

  async addBulkNotificationJobs(
    notifications: NotificationJobData[],
  ): Promise<Job[]> {
    const jobs = await this.notificationQueue.addBulk(
      notifications.map((data) => ({
        name: 'send-notification',
        data,
        opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      })),
    );
    this.logger.log(`Bulk notification jobs added: ${jobs.length} jobs`);
    return jobs;
  }

  async addBackupJob(data: BackupJobData): Promise<Job> {
    const job = await this.backupQueue.add('create-backup', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log(`Backup job added: ${job.id} for tenant ${data.tenantId}`);
    return job;
  }

  async addReportJob(data: ReportJobData): Promise<Job> {
    const job = await this.reportQueue.add('generate-report', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      priority: data.reportType === 'tax' ? 1 : 3,
    });
    this.logger.log(`Report job added: ${job.id} type ${data.reportType}`);
    return job;
  }

  async addEmailJob(data: EmailJobData): Promise<Job> {
    const job = await this.emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log(`Email job added: ${job.id} to ${data.to}`);
    return job;
  }

  async addBulkEmailJobs(emails: EmailJobData[]): Promise<Job[]> {
    const jobs = await this.emailQueue.addBulk(
      emails.map((data) => ({
        name: 'send-email',
        data,
        opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      })),
    );
    this.logger.log(`Bulk email jobs added: ${jobs.length} jobs`);
    return jobs;
  }

  async addSyncJob(data: SyncJobData): Promise<Job> {
    const job = await this.syncQueue.add('process-sync', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
    });
    this.logger.log(`Sync job added: ${job.id} for ${data.entity}`);
    return job;
  }

  async getQueueStatus(queueName: string): Promise<QueueStatus> {
    const queues: Record<string, Queue> = {
      notifications: this.notificationQueue,
      backup: this.backupQueue,
      reports: this.reportQueue,
      email: this.emailQueue,
      sync: this.syncQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const [waiting, active, completed, failed, delayed, isPaused] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  async getAllQueueStatuses(): Promise<QueueStatus[]> {
    const queueNames = ['notifications', 'backup', 'reports', 'email', 'sync'];
    const statuses = await Promise.all(
      queueNames.map((name) => this.getQueueStatus(name)),
    );
    return statuses;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queues: Record<string, Queue> = {
      notifications: this.notificationQueue,
      backup: this.backupQueue,
      reports: this.reportQueue,
      email: this.emailQueue,
      sync: this.syncQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.pause();
    this.logger.log(`Queue paused: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queues: Record<string, Queue> = {
      notifications: this.notificationQueue,
      backup: this.backupQueue,
      reports: this.reportQueue,
      email: this.emailQueue,
      sync: this.syncQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.resume();
    this.logger.log(`Queue resumed: ${queueName}`);
  }

  async pauseAllQueues(): Promise<void> {
    await Promise.all([
      this.notificationQueue.pause(),
      this.backupQueue.pause(),
      this.reportQueue.pause(),
      this.emailQueue.pause(),
      this.syncQueue.pause(),
    ]);
    this.logger.log('All queues paused');
  }

  async resumeAllQueues(): Promise<void> {
    await Promise.all([
      this.notificationQueue.resume(),
      this.backupQueue.resume(),
      this.reportQueue.resume(),
      this.emailQueue.resume(),
      this.syncQueue.resume(),
    ]);
    this.logger.log('All queues resumed');
  }

  async cleanQueue(queueName: string, grace: number = 3600000): Promise<void> {
    const queues: Record<string, Queue> = {
      notifications: this.notificationQueue,
      backup: this.backupQueue,
      reports: this.reportQueue,
      email: this.emailQueue,
      sync: this.syncQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.clean(grace, 1000, 'completed');
    await queue.clean(grace, 1000, 'failed');
    this.logger.log(`Queue cleaned: ${queueName}`);
  }

  async getJob(jobId: string, queueName: string): Promise<Job | null> {
    const queues: Record<string, Queue> = {
      notifications: this.notificationQueue,
      backup: this.backupQueue,
      reports: this.reportQueue,
      email: this.emailQueue,
      sync: this.syncQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return (await queue.getJob(jobId)) ?? null;
  }

  async removeJob(jobId: string, queueName: string): Promise<void> {
    const job = await this.getJob(jobId, queueName);
    if (job) {
      await job.remove();
      this.logger.log(`Job removed: ${jobId} from ${queueName}`);
    }
  }
}