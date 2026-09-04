import crypto from 'crypto';
import { DbIdempotencyKey } from '@/types/database';

// In-memory cluster cache for sub-millisecond idempotency deduplication
const memoryIdempotencyStore = new Map<string, DbIdempotencyKey>();

export function computeRequestHash(payload: any): string {
  const canonicalString = JSON.stringify(payload || {}, Object.keys(payload || {}).sort());
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  status?: 'PROCESSING' | 'COMMITTED' | 'FAILED';
  cachedResponse?: {
    statusCode: number;
    body: any;
  };
  error?: string;
}

/**
 * Checks and acquires an idempotency lock for a financial transaction.
 */
export async function checkAndLockIdempotencyKey(
  key: string,
  orgId: string,
  endpoint: string,
  requestPayload: any,
  lockTtlSeconds: number = 60
): Promise<IdempotencyCheckResult> {
  if (!key || typeof key !== 'string' || key.length < 8) {
    return {
      isDuplicate: false,
      error: 'INVALID_IDEMPOTENCY_KEY: Key must be a valid unique string (e.g. UUID v4)',
    };
  }

  const lookupKey = `${orgId}:${key}`;
  const requestHash = computeRequestHash(requestPayload);
  const existing = memoryIdempotencyStore.get(lookupKey);

  if (existing) {
    const isLockActive = new Date(existing.locked_until) > new Date();

    if (existing.status === 'COMMITTED') {
      return {
        isDuplicate: true,
        status: 'COMMITTED',
        cachedResponse: {
          statusCode: existing.response_status || 200,
          body: existing.response_body,
        },
      };
    }

    if (existing.status === 'PROCESSING' && isLockActive) {
      return {
        isDuplicate: true,
        status: 'PROCESSING',
        error: 'IDEMPOTENCY_LOCKED: A request with this Idempotency-Key is currently being executed. Do not retry concurrently.',
      };
    }
  }

  // Acquire new lock
  const lockedRecord: DbIdempotencyKey = {
    id: `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    key,
    org_id: orgId,
    endpoint,
    request_hash: requestHash,
    status: 'PROCESSING',
    locked_until: new Date(Date.now() + lockTtlSeconds * 1000).toISOString(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(), // 72-hour retention
  };

  memoryIdempotencyStore.set(lookupKey, lockedRecord);

  return {
    isDuplicate: false,
    status: 'PROCESSING',
  };
}

/**
 * Commits the cached response against the idempotency key upon successful transaction completion.
 */
export async function commitIdempotencyKey(
  key: string,
  orgId: string,
  statusCode: number,
  responseBody: any
): Promise<void> {
  const lookupKey = `${orgId}:${key}`;
  const record = memoryIdempotencyStore.get(lookupKey);
  if (record) {
    record.status = 'COMMITTED';
    record.response_status = statusCode;
    record.response_body = responseBody;
    memoryIdempotencyStore.set(lookupKey, record);
  }
}
