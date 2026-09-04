import { NextResponse } from 'next/server';
import { ApiResponse as ApiResponsePayload, ApiErrorResponse, ApiErrorDetail } from '@/types/apiGateway';

export function createSuccessResponse<T>(
  data: T,
  options: {
    message?: string;
    code?: string;
    requestId?: string;
    correlationId?: string;
    durationMs?: number;
    environment?: 'SANDBOX' | 'PRODUCTION';
    idempotencyCached?: boolean;
    status?: number;
  }
) {
  const reqId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload: ApiResponsePayload<T> = {
    status: 'success',
    code: options.code || 'OPERATION_SUCCESSFUL',
    message: options.message,
    data,
    meta: {
      request_id: reqId,
      correlation_id: options.correlationId || reqId,
      timestamp: new Date().toISOString(),
      duration_ms: options.durationMs,
      environment: options.environment || 'PRODUCTION',
      idempotency_cached: options.idempotencyCached || false,
    },
  };

  return NextResponse.json(payload, { status: options.status || 200 });
}

export function createErrorResponse(options: {
  code: string;
  message: string;
  requestId?: string;
  httpStatus?: number;
  details?: ApiErrorDetail[];
}) {
  const reqId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload: ApiErrorResponse = {
    status: 'error',
    error: {
      code: options.code,
      message: options.message,
      request_id: reqId,
      details: options.details,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(payload, { status: options.httpStatus || 400 });
}

export class ApiResponse {
  public static success<T>(data: T, message?: string, status: number = 200) {
    return createSuccessResponse(data, { message, status });
  }

  public static created<T>(data: T, message?: string) {
    return createSuccessResponse(data, { message, status: 201 });
  }

  public static badRequest(message: string, code: string = 'BAD_REQUEST', details?: ApiErrorDetail[]) {
    return createErrorResponse({ code, message, httpStatus: 400, details });
  }

  public static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    return createErrorResponse({ code, message, httpStatus: 404 });
  }

  public static error(message: string, code: string = 'INTERNAL_ERROR', httpStatus: number = 500) {
    return createErrorResponse({ code, message, httpStatus });
  }
}
