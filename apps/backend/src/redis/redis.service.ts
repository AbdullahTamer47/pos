import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { RedisOptions, Redis as RedisClient } from 'ioredis';
import { EventEmitter } from 'events';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClient | null = null;
  private isConnected = false;
  private readonly memoryStore = new Map<string, { value: string; expiresAt?: number }>();
  private readonly hashStore = new Map<string, Map<string, string>>();
  private readonly setStore = new Map<string, Set<string>>();
  private readonly sortedSetStore = new Map<string, Map<string, number>>();
  private readonly memoryBus = new EventEmitter();
  private readonly subscribers: Map<string, RedisClient> = new Map();
  private readonly logger = new Logger(RedisService.name);

  constructor(options: RedisOptions) {
    try {
      this.client = new Redis({
        ...options,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't crash or loop forever on connection failure
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully');
      });

      this.client.on('error', (err: Error) => {
        this.isConnected = false;
        this.logger.warn(`Redis unavailable (${err.message}). Using In-Memory fallback.`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Attempt non-blocking connect
      this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection skipped (${err.message}). Operating in standalone in-memory mode.`);
      });
    } catch (err: unknown) {
      this.isConnected = false;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis initialization failed (${errorMsg}). In-memory mode active.`);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // Fallback to memory
      }
    }
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          return await this.client.set(key, value, 'EX', ttlSeconds);
        }
        return await this.client.set(key, value);
      } catch {
        // Fallback to memory
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deletedCount = 0;
    if (this.isConnected && this.client) {
      try {
        return await this.client.del(...keys);
      } catch {
        // Fallback to memory
      }
    }
    for (const key of keys) {
      if (this.memoryStore.delete(key)) deletedCount++;
      if (this.hashStore.delete(key)) deletedCount++;
      if (this.setStore.delete(key)) deletedCount++;
      if (this.sortedSetStore.delete(key)) deletedCount++;
    }
    return deletedCount;
  }

  async exists(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.exists(key);
      } catch {
        // Fallback
      }
    }
    const val = await this.get(key);
    return val !== null || this.hashStore.has(key) || this.setStore.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.expire(key, seconds);
      } catch {
        // Fallback
      }
    }
    const item = this.memoryStore.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.ttl(key);
      } catch {
        // Fallback
      }
    }
    const item = this.memoryStore.get(key);
    if (!item || !item.expiresAt) return -1;
    const remaining = Math.floor((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.keys(pattern);
      } catch {
        // Fallback
      }
    }
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.memoryStore.keys()).filter((k) => regex.test(k));
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.hset(key, field, value);
      } catch {
        // Fallback
      }
    }
    if (!this.hashStore.has(key)) {
      this.hashStore.set(key, new Map());
    }
    this.hashStore.get(key)!.set(field, value);
    return 1;
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.hget(key, field);
      } catch {
        // Fallback
      }
    }
    return this.hashStore.get(key)?.get(field) ?? null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.hgetall(key);
      } catch {
        // Fallback
      }
    }
    const map = this.hashStore.get(key);
    if (!map) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of map.entries()) {
      result[k] = v;
    }
    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.hdel(key, ...fields);
      } catch {
        // Fallback
      }
    }
    const map = this.hashStore.get(key);
    if (!map) return 0;
    let count = 0;
    for (const field of fields) {
      if (map.delete(field)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.incr(key);
      } catch {
        // Fallback
      }
    }
    const val = await this.get(key);
    const num = val ? parseInt(val, 10) + 1 : 1;
    await this.set(key, num.toString());
    return num;
  }

  async decr(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.decr(key);
      } catch {
        // Fallback
      }
    }
    const val = await this.get(key);
    const num = val ? parseInt(val, 10) - 1 : -1;
    await this.set(key, num.toString());
    return num;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.sadd(key, ...members);
      } catch {
        // Fallback
      }
    }
    if (!this.setStore.has(key)) {
      this.setStore.set(key, new Set());
    }
    const set = this.setStore.get(key)!;
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.smembers(key);
      } catch {
        // Fallback
      }
    }
    return Array.from(this.setStore.get(key) ?? []);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.srem(key, ...members);
      } catch {
        // Fallback
      }
    }
    const set = this.setStore.get(key);
    if (!set) return 0;
    let count = 0;
    for (const m of members) {
      if (set.delete(m)) count++;
    }
    return count;
  }

  async zadd(
    key: string,
    score: number | string,
    member: string,
  ): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.zadd(key, score, member);
      } catch {
        // Fallback
      }
    }
    if (!this.sortedSetStore.has(key)) {
      this.sortedSetStore.set(key, new Map());
    }
    this.sortedSetStore.get(key)!.set(member, Number(score));
    return 1;
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
  ): Promise<string[]> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.zrange(key, start, stop);
      } catch {
        // Fallback
      }
    }
    const map = this.sortedSetStore.get(key);
    if (!map) return [];
    const sorted = Array.from(map.entries()).sort((a, b) => a[1] - b[1]).map(e => e[0]);
    const end = stop === -1 ? undefined : stop + 1;
    return sorted.slice(start, end);
  }

  async publish(channel: string, message: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.publish(channel, message);
      } catch {
        // Fallback
      }
    }
    this.memoryBus.emit(channel, message);
    return 1;
  }

  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void,
  ): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const subscriber = new Redis(this.client.options);
        await subscriber.subscribe(channel);
        subscriber.on('message', (ch: string, msg: string) => {
          callback(msg, ch);
        });
        this.subscribers.set(channel, subscriber);
        return;
      } catch {
        // Fallback
      }
    }
    this.memoryBus.on(channel, (msg: string) => {
      callback(msg, channel);
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    const subscriber = this.subscribers.get(channel);
    if (subscriber) {
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      } catch {
        // Ignore
      }
      this.subscribers.delete(channel);
    }
    this.memoryBus.removeAllListeners(channel);
  }

  getClient(): RedisClient | null {
    return this.client;
  }

  async disconnect(): Promise<void> {
    for (const [, subscriber] of this.subscribers) {
      try {
        await subscriber.quit();
      } catch {
        // Ignore
      }
    }
    this.subscribers.clear();
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // Ignore
      }
    }
    this.memoryStore.clear();
    this.hashStore.clear();
    this.setStore.clear();
    this.sortedSetStore.clear();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }
}