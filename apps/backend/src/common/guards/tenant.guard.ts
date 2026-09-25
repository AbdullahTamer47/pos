import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = (request as unknown as Record<string, unknown>).tenantId as
      | string
      | undefined;
    const user = (request as unknown as Record<string, unknown>).user as
      | { tenantId?: string; role?: string }
      | undefined;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    if (user && user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (user && user.tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'User does not belong to the requested tenant',
      );
    }

    return true;
  }
}