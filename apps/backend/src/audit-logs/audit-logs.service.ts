import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      entity?: string;
      action?: string;
      userId?: string;
      entityId?: string;
      startDate?: string;
      endDate?: string;
    },
    tenantId: string,
    userRole: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (userRole !== 'SUPER_ADMIN') {
      where.tenantId = tenantId;
    }

    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;
    if (query.entityId) where.entityId = query.entityId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const uniqueEntities = await this.prisma.auditLog.findMany({
      where: userRole !== 'SUPER_ADMIN' ? { tenantId } : {},
      select: { entity: true },
      distinct: ['entity'],
    });

    const uniqueActions = await this.prisma.auditLog.findMany({
      where: userRole !== 'SUPER_ADMIN' ? { tenantId } : {},
      select: { action: true },
      distinct: ['action'],
    });

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        filters: {
          entities: uniqueEntities.map((e) => e.entity),
          actions: uniqueActions.map((a) => a.action),
        },
      },
    };
  }

  async createLog(data: {
    tenantId: string;
    userId?: string;
    entity: string;
    entityId?: string;
    action: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const log = await this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        entity: data.entity,
        entityId: data.entityId,
        action: data.action,
        before: data.before ? (data.before as never) : undefined,
        after: data.after ? (data.after as never) : undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    this.logger.log(`Audit log: ${data.action} on ${data.entity} (${data.entityId || 'N/A'})`);
    return log;
  }
}