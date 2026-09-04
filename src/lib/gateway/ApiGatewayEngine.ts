// Central API Gateway Security, Scope Authorization & Idempotency Engine

import { StandardApiResponse } from '@/types/gatewayEngine';

export class ApiGatewayEngine {
  private static instance: ApiGatewayEngine;

  private idempotencyStore: Map<
    string,
    { requestHash: string; response: StandardApiResponse; createdAt: number }
  > = new Map();

  private constructor() {}

  public static getInstance(): ApiGatewayEngine {
    if (!ApiGatewayEngine.instance) {
      ApiGatewayEngine.instance = new ApiGatewayEngine();
    }
    return ApiGatewayEngine.instance;
  }

  public createResponse<T>(data: T, requestId?: string, correlationId?: string): StandardApiResponse<T> {
    const reqId = requestId || `KP-REQ-${Date.now().toString(16)}`;
    return {
      success: true,
      data,
      meta: {
        requestId: reqId,
        correlationId: correlationId || reqId,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    };
  }

  public createError(
    code: string,
    message: string,
    details?: string[],
    retryable: boolean = false,
    requestId?: string,
    correlationId?: string
  ): StandardApiResponse<never> {
    const reqId = requestId || `KP-REQ-${Date.now().toString(16)}`;
    return {
      success: false,
      error: {
        code,
        message,
        details,
        retryable,
      },
      meta: {
        requestId: reqId,
        correlationId: correlationId || reqId,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    };
  }

  public checkIdempotency(
    clientId: string,
    idempotencyKey: string,
    requestPayload: any
  ): { isMatch: boolean; cachedResponse?: StandardApiResponse; isConflict?: boolean } {
    const key = `${clientId}:${idempotencyKey}`;
    const payloadHash = JSON.stringify(requestPayload);
    const existing = this.idempotencyStore.get(key);

    if (!existing) {
      return { isMatch: false };
    }

    if (existing.requestHash === payloadHash) {
      return { isMatch: true, cachedResponse: existing.response };
    }

    // Key reused with different payload -> Conflict
    return { isMatch: false, isConflict: true };
  }

  public recordIdempotency(
    clientId: string,
    idempotencyKey: string,
    requestPayload: any,
    response: StandardApiResponse
  ) {
    const key = `${clientId}:${idempotencyKey}`;
    this.idempotencyStore.set(key, {
      requestHash: JSON.stringify(requestPayload),
      response,
      createdAt: Date.now(),
    });
  }
}
