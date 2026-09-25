import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentTenant = createParamDecorator<
  unknown,
  ExecutionContext
>((_data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const tenantId = (request as unknown as Record<string, unknown>).tenantId as
    | string
    | undefined;
  return tenantId || null;
});