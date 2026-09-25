import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getTenantStorage } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = this.extractTenantId(req);

    if (tenantId) {
      (req as unknown as Record<string, unknown>).tenantId = tenantId;
    }

    const tenantStorage = getTenantStorage();
    const store = new Map<string, unknown>();
    store.set('tenantId', tenantId);
    store.set('requestId', (req as unknown as Record<string, unknown>).requestId || '');

    tenantStorage.run(store, () => {
      next();
    });
  }

  private extractTenantId(req: Request): string | undefined {
    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
    if (headerTenantId) {
      return headerTenantId;
    }

    const host = req.headers.host || '';
    const subdomainMatch = host.match(/^([^.]+)\./);
    if (subdomainMatch && subdomainMatch[1] !== 'www' && subdomainMatch[1] !== 'api') {
      return subdomainMatch[1];
    }

    return undefined;
  }
}