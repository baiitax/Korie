// Durable Financial Idempotency & Conflict Prevention Engine

import { IdempotencyRecord } from '@/types/integrationEngine';

export class IdempotencyEngine {
  private static instance: IdempotencyEngine;

  private records: Map<string, IdempotencyRecord> = new Map();

  private constructor() {}

  public static getInstance(): IdempotencyEngine {
    if (!IdempotencyEngine.instance) {
      IdempotencyEngine.instance = new IdempotencyEngine();
    }
    return IdempotencyEngine.instance;
  }

  public checkOrStore(
    clientId: string,
    endpoint: string,
    idempotencyKey: string,
    payloadHash: string,
    executor: () => { status: number; body: any; resourceId?: string }
  ): { isReplay: boolean; status: number; body: any; resourceId?: string } {
    const existing = this.records.get(idempotencyKey);

    if (existing) {
      if (existing.requestHashSha256 !== payloadHash) {
        return {
          isReplay: false,
          status: 409,
          body: {
            error: 'IDEMPOTENCY_CONFLICT',
            message: 'Provided Idempotency-Key was previously used with a materially different request payload.',
          },
        };
      }

      return {
        isReplay: true,
        status: existing.responseStatus,
        body: existing.responseBody,
        resourceId: existing.resourceId,
      };
    }

    const executed = executor();
    const record: IdempotencyRecord = {
      id: `idemp-rec-${Date.now().toString().slice(-6)}`,
      clientId,
      endpoint,
      idempotencyKey,
      requestHashSha256: payloadHash,
      responseStatus: executed.status,
      responseBody: executed.body,
      resourceId: executed.resourceId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24-hour retention
    };

    this.records.set(idempotencyKey, record);

    return {
      isReplay: false,
      status: executed.status,
      body: executed.body,
      resourceId: executed.resourceId,
    };
  }
}
