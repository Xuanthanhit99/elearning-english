import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponseBody = {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  method: string;
  timestamp: string;
  requestId?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = this.buildResponseBody(exception, status, request);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(responseBody);
  }

  private buildResponseBody(
    exception: unknown,
    status: number,
    request: Request,
  ): ErrorResponseBody {
    const requestId = this.getRequestId(request);
    const fallbackError =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal Server Error'
        : HttpStatus[status] || 'Error';

    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
      const normalized =
        typeof raw === 'string' ? { message: raw } : this.asRecord(raw);

      return {
        success: false,
        statusCode: status,
        message: this.getMessage(normalized.message, exception.message),
        error: this.getError(normalized.error, fallbackError),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
      };
    }

    return {
      success: false,
      statusCode: status,
      message:
        process.env.NODE_ENV === 'production'
          ? 'Có lỗi xảy ra, vui lòng thử lại sau.'
          : exception instanceof Error
            ? exception.message
            : 'Có lỗi xảy ra, vui lòng thử lại sau.',
      error: fallbackError,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private getMessage(value: unknown, fallback: string) {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private getError(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private getRequestId(request: Request) {
    const value = request.headers['x-request-id'];
    return Array.isArray(value) ? value[0] : value;
  }
}
