import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../common/decorators/public.decorator';
import * as os from 'os';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTimeMs: number;
  message?: string;
}

interface DetailedHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  version: string;
  checks: Record<string, HealthCheck>;
  system: {
    platform: string;
    nodeVersion: string;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    cpuUsage: {
      user: number;
      system: number;
    };
    totalMemory: number;
    freeMemory: number;
    cpuCores: number;
    loadAverage: number[];
  };
  timestamp: string;
}

@Controller()
export class HealthController {
  private readonly startTime: number;
  private readonly appVersion: string;

  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private activeConnections = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.startTime = Date.now();
    this.appVersion = process.env.npm_package_version || '1.0.0';
  }

  @Public()
  @Get('health')
  async check(): Promise<{
    status: string;
    uptime: number;
    version: string;
    memory: { rss: string; heapUsed: string };
    timestamp: string;
  }> {
    const memoryUsage = process.memoryUsage();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    let dbStatus = 'healthy';
    let redisStatus = 'healthy';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unhealthy';
    }

    try {
      await this.redis.set('health:check', 'ok', 10);
      const result = await this.redis.get('health:check');
      if (result !== 'ok') {
        redisStatus = 'unhealthy';
      }
    } catch {
      redisStatus = 'unhealthy';
    }

    const overallStatus = dbStatus === 'healthy' && redisStatus === 'healthy'
      ? 'healthy'
      : 'degraded';

    return {
      status: overallStatus,
      uptime,
      version: this.appVersion,
      memory: {
        rss: this.formatBytes(memoryUsage.rss),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/detailed')
  async detailed(): Promise<DetailedHealth> {
    const startCheck = Date.now();
    const memoryUsage = process.memoryUsage();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const cpuUsage = process.cpuUsage();

    const checks: Record<string, HealthCheck> = {};

    let dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        responseTimeMs: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        responseTimeMs: Date.now() - dbStart,
        message: (error as Error).message,
      };
    }

    let redisStart = Date.now();
    try {
      await this.redis.set('health:detailed', 'ok', 10);
      const result = await this.redis.get('health:detailed');
      checks.redis = {
        status: result === 'ok' ? 'healthy' : 'unhealthy',
        responseTimeMs: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        responseTimeMs: Date.now() - redisStart,
        message: (error as Error).message,
      };
    }

    let diskStart = Date.now();
    try {
      const testKey = `health:disk:${Date.now()}`;
      await this.redis.set(testKey, 'test', 5);
      await this.redis.del(testKey);
      checks.disk = {
        status: 'healthy',
        responseTimeMs: Date.now() - diskStart,
      };
    } catch (error) {
      checks.disk = {
        status: 'unhealthy',
        responseTimeMs: Date.now() - diskStart,
        message: (error as Error).message,
      };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

    return {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
      uptime,
      version: this.appVersion,
      checks,
      system: {
        platform: os.platform(),
        nodeVersion: process.version,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('metrics')
  getMetrics(): {
    metrics: Record<string, number | string>;
    timestamp: string;
  } {
    const memoryUsage = process.memoryUsage();

    return {
      metrics: {
        uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
        request_count: this.requestCount,
        error_count: this.errorCount,
        active_connections: this.activeConnections,
        avg_response_time_ms: this.requestCount > 0
          ? Math.round((this.totalResponseTime / this.requestCount) * 100) / 100
          : 0,
        memory_rss_bytes: memoryUsage.rss,
        memory_heap_used_bytes: memoryUsage.heapUsed,
        memory_heap_total_bytes: memoryUsage.heapTotal,
        memory_external_bytes: memoryUsage.external,
        cpu_user: process.cpuUsage().user,
        cpu_system: process.cpuUsage().system,
        node_version: process.version,
        process_pid: process.pid,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('version')
  getVersion(): {
    version: string;
    nodeVersion: string;
    environment: string;
    platform: string;
    timestamp: string;
  } {
    return {
      version: this.appVersion,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      platform: os.platform(),
      timestamp: new Date().toISOString(),
    };
  }

  incrementRequestCount(): void {
    this.requestCount++;
  }

  incrementErrorCount(): void {
    this.errorCount++;
  }

  addResponseTime(ms: number): void {
    this.totalResponseTime += ms;
  }

  incrementActiveConnections(): void {
    this.activeConnections++;
  }

  decrementActiveConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${size} ${units[i] || 'Bytes'}`;
  }
}