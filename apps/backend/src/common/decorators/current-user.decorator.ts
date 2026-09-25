import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  name: string;
  phone?: string;
}

export const CurrentUser = createParamDecorator<
  keyof CurrentUserPayload | undefined,
  ExecutionContext
>((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = (request as unknown as Record<string, unknown>).user as
    | CurrentUserPayload
    | undefined;

  if (!user) {
    return null;
  }

  return data ? user[data] : user;
});