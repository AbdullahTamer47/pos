import { describe, it, expect } from 'vitest';
import { InMemoryQueue } from './in-memory-queue';

describe('InMemoryQueue', () => {
  it('should initialize with queue name', () => {
    const queue = new InMemoryQueue('test-queue');
    expect(queue.name).toBe('test-queue');
  });

  it('should add jobs and process them', async () => {
    const queue = new InMemoryQueue('test-queue');
    let processed = false;

    queue.setProcessor(async (job) => {
      processed = true;
      return { status: 'done', data: job.data };
    });

    const job = await queue.add('test-job', { foo: 'bar' });
    expect(job).toBeDefined();
    expect(job.name).toBe('test-job');
    expect(job.data).toEqual({ foo: 'bar' });

    // Wait for event loop
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(processed).toBe(true);
  });
});
