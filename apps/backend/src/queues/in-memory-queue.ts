import { Logger } from '@nestjs/common';

export interface InMemoryJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts?: any;
  progress?: number;
  returnvalue?: any;
  updateProgress: (progress: number) => Promise<void>;
  remove: () => Promise<void>;
}

export class InMemoryQueue {
  private readonly logger: Logger;
  private readonly jobs = new Map<string, InMemoryJob>();
  private completedCount = 0;
  private isQueuePaused = false;
  private processorFn: ((job: InMemoryJob) => Promise<any>) | null = null;

  constructor(public readonly name: string) {
    this.logger = new Logger(`InMemoryQueue:${name}`);
  }

  setProcessor(fn: (job: InMemoryJob) => Promise<any>) {
    this.processorFn = fn;
  }

  async add(name: string, data: any, opts?: any): Promise<InMemoryJob> {
    const id = `${this.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: InMemoryJob = {
      id,
      name,
      data,
      opts,
      progress: 0,
      updateProgress: async (p: number) => {
        job.progress = p;
      },
      remove: async () => {
        this.jobs.delete(id);
      },
    };

    this.jobs.set(id, job);

    // Asynchronously trigger processing if processor is attached
    if (this.processorFn) {
      const delay = opts?.delay || 0;
      setTimeout(() => {
        if (!this.isQueuePaused && this.processorFn) {
          this.processorFn(job)
            .then((res) => {
              job.returnvalue = res;
              this.completedCount++;
            })
            .catch((err) => {
              this.logger.error(`Job ${id} failed: ${err.message}`, err.stack);
            });
        }
      }, delay);
    } else {
      this.completedCount++;
    }

    return job;
  }

  async addBulk(items: Array<{ name: string; data: any; opts?: any }>): Promise<InMemoryJob[]> {
    return Promise.all(items.map((item) => this.add(item.name, item.data, item.opts)));
  }

  async getWaitingCount(): Promise<number> {
    return 0;
  }

  async getActiveCount(): Promise<number> {
    return 0;
  }

  async getCompletedCount(): Promise<number> {
    return this.completedCount;
  }

  async getFailedCount(): Promise<number> {
    return 0;
  }

  async getDelayedCount(): Promise<number> {
    return 0;
  }

  async isPaused(): Promise<boolean> {
    return this.isQueuePaused;
  }

  async pause(): Promise<void> {
    this.isQueuePaused = true;
  }

  async resume(): Promise<void> {
    this.isQueuePaused = false;
  }

  async clean(): Promise<string[]> {
    this.jobs.clear();
    return [];
  }

  async getJob(id: string): Promise<InMemoryJob | null> {
    return this.jobs.get(id) ?? null;
  }
}
