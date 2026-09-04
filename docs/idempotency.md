# Idempotency & Concurrency Control Specification

## 1. Zero-Duplicate Guarantee
All financial requests require an `Idempotency-Key` HTTP header (UUID v4 or deterministic partner hash).

## 2. Distributed Locking & Atomic Execution
```
1. Client sends POST with Idempotency-Key: "550e8400-e29b-41d4-a716-446655440000"
2. Gateway queries idempotency_records:
   - If EXISTS with COMPLETED status: Return cached HTTP response immediately.
   - If EXISTS with IN_PROGRESS status: Return HTTP 409 Conflict ("Transaction in flight").
   - If NOT EXISTS: Insert record with IN_PROGRESS and acquire 30-second advisory lock.
3. Process Double-Entry Ledger Posting.
4. Update idempotency_records with COMPLETED status and serialized response payload.
5. Return HTTP 200/201 to caller.
```

## 3. Cache Expiration & Replay Window
- Idempotency records are cached in memory/Redis with a **24-hour Time-To-Live (TTL)**.
- Historical idempotency keys are retained in PostgreSQL indefinitely for regulatory audit.
