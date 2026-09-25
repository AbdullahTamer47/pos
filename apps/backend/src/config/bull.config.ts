import { registerAs } from '@nestjs/config';

export default registerAs('bull', () => ({
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10),
  },
  defaultJobOptions: {
    removeOnComplete: {
      count: parseInt(process.env.BULL_REMOVE_ON_COMPLETE_COUNT || '1000', 10),
    },
    removeOnFail: {
      count: parseInt(process.env.BULL_REMOVE_ON_FAIL_COUNT || '5000', 10),
    },
    attempts: parseInt(process.env.BULL_JOB_ATTEMPTS || '3', 10),
    backoff: {
      type: (process.env.BULL_BACKOFF_TYPE || 'exponential') as
        | 'fixed'
        | 'exponential',
      delay: parseInt(process.env.BULL_BACKOFF_DELAY || '1000', 10),
    },
  },
  limiter: {
    max: parseInt(process.env.BULL_LIMITER_MAX || '100', 10),
    duration: parseInt(process.env.BULL_LIMITER_DURATION || '5000', 10),
  },
  queues: {
    orders: {
      name: 'orders',
      concurrency: parseInt(process.env.BULL_ORDERS_CONCURRENCY || '5', 10),
    },
    inventory: {
      name: 'inventory',
      concurrency: parseInt(process.env.BULL_INVENTORY_CONCURRENCY || '3', 10),
    },
    notifications: {
      name: 'notifications',
      concurrency: parseInt(
        process.env.BULL_NOTIFICATIONS_CONCURRENCY || '10',
        10,
      ),
    },
    reports: {
      name: 'reports',
      concurrency: parseInt(process.env.BULL_REPORTS_CONCURRENCY || '2', 10),
    },
    sync: {
      name: 'sync',
      concurrency: parseInt(process.env.BULL_SYNC_CONCURRENCY || '5', 10),
    },
    emails: {
      name: 'emails',
      concurrency: parseInt(process.env.BULL_EMAILS_CONCURRENCY || '5', 10),
    },
  },
}));