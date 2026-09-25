import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'smartpos:',
  enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
  maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES_PER_REQUEST
    ? parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST, 10)
    : null,
  retryStrategy: {
    maxAttempts: parseInt(process.env.REDIS_RETRY_MAX_ATTEMPTS || '10', 10),
    maxDelay: parseInt(process.env.REDIS_RETRY_MAX_DELAY || '3000', 10),
  },
  session: {
    prefix: process.env.REDIS_SESSION_PREFIX || 'smartpos:session:',
    ttl: parseInt(process.env.REDIS_SESSION_TTL || '86400', 10),
  },
  cache: {
    prefix: process.env.REDIS_CACHE_PREFIX || 'smartpos:cache:',
    defaultTtl: parseInt(process.env.REDIS_CACHE_DEFAULT_TTL || '300', 10),
  },
  queue: {
    prefix: process.env.REDIS_QUEUE_PREFIX || 'smartpos:queue:',
  },
  socket: {
    prefix: process.env.REDIS_SOCKET_PREFIX || 'smartpos:socket:',
  },
  locks: {
    prefix: process.env.REDIS_LOCK_PREFIX || 'smartpos:lock:',
    defaultTtl: parseInt(process.env.REDIS_LOCK_DEFAULT_TTL || '30000', 10),
  },
}));