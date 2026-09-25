import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data: T) => {
        const statusCode = response.statusCode || 200;
        const message =
          data && typeof data === 'object' && 'message' in data && typeof (data as Record<string, unknown>).message === 'string'
            ? ((data as Record<string, unknown>).message as string)
            : undefined;

        return {
          success: true,
          data: data,
          message: message || this.getDefaultMessage(statusCode),
          statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
        return 'OK';
      case 201:
        return 'Created successfully';
      case 204:
        return 'No Content';
      default:
        return 'Success';
    }
  }
}