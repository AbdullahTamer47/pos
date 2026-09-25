import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, CashierPermission } from '../decorators/permissions.decorator';
import { Request } from 'express';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      CashierPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, unknown>).user as
      | { permissions?: CashierPermission[] }
      | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.permissions || user.permissions.length === 0) {
      throw new ForbiddenException('No permissions assigned');
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions!.includes(permission),
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(
        (p) => !user.permissions!.includes(p),
      );
      throw new ForbiddenException(
        `Missing required permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}