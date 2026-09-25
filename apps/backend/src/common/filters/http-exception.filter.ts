import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const acceptLanguage = (request.headers['accept-language'] as string) || 'en';
    const isArabic = acceptLanguage.startsWith('ar');

    let status: number;
    let message: string;
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        if (Array.isArray(resp.message)) {
          errors = this.parseValidationErrors(resp.message as string[], isArabic);
          message = isArabic
            ? 'فشل التحقق من صحة البيانات'
            : 'Validation failed';
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isArabic
        ? 'حدث خطأ داخلي في الخادم'
        : 'Internal server error';
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isArabic
        ? 'حدث خطأ غير معروف'
        : 'Unknown error';
    }

    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errors && { errors }),
    };

    response.status(status).json(errorResponse);
  }

  private parseValidationErrors(
    messages: string[],
    isArabic: boolean,
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const msg of messages) {
      const field = isArabic ? 'الحقول' : 'fields';
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(msg);
    }
    return errors;
  }
}