import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.url;

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!mutatingMethods.includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const userId = (request as unknown as Record<string, unknown>).user
      ? ((request as unknown as Record<string, unknown>).user as Record<string, unknown>).id
      : undefined;

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `AUDIT: ${method} ${url} by user ${userId} - ${duration}ms`,
          );

          void this.saveAuditLog({
            action: this.mapMethodToAction(method),
            entity: this.extractEntity(url),
            userId: userId as string | undefined,
            metadata: {
              method,
              url,
              duration,
              responseStatus: 200,
            },
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `AUDIT ERROR: ${method} ${url} - ${error.message} - ${duration}ms`,
          );
        },
      }),
    );
  }

  private mapMethodToAction(method: string): string {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UNKNOWN';
    }
  }

  private extractEntity(url: string): string {
    const parts = url.replace(/^\/api\/v\d+\//, '').split('/');
    const entity = parts[0];
    return entity || 'UNKNOWN';
  }

  private async saveAuditLog(params: {
    action: string;
    entity: string;
    userId?: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      const tenantId = (params.metadata?.tenantId as string);
      if (!tenantId || tenantId === 'system') {
        return;
      }
      const prisma = this.getPrismaService();
      if (prisma) {
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: params.action,
            entity: params.entity,
            userId: params.userId || null,
            after: params.metadata ? JSON.stringify(params.metadata) : null,
          },
        });
      }
    } catch (error) {
      this.logger.debug(`Audit log skipped: ${(error as Error).message}`);
    }
  }

  private getPrismaService(): PrismaService | null {
    try {
      const { PrismaService } = require('../../prisma/prisma.service');
      const { getTenantStorage } = require('../../prisma/prisma.service');

      const storage = getTenantStorage();
      const store = storage.getStore();

      const prisma = new PrismaService();
      return prisma;
    } catch {
      return null;
    }
  }
}