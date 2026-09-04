# KORIEPAY API IDEMPOTENCY & DOUBLE DEBIT IMMUNITY

## 1. Idempotency-Key Mechanism
To protect financial integrity during network drops or client retries, all mutating endpoints (`POST /transfers`, `POST /checkout`, `POST /agency/cash-out`) require an `Idempotency-Key` header with a unique UUID v4:

```http
POST /v1/transfers/cross-border
Idempotency-Key: 99281a0e-4b21-4f91-a1b2-8c9d0e1f2a34
```

---

## 2. Server-Side Execution Model
1. **Acquire Distributed Lock**: Redis lock on `org_id:idempotency_key` (TTL: 120s).
2. **Check Hash Table**: If key exists and status is `COMMITTED`, return cached HTTP response body immediately without executing financial debit.
3. **Execute Transaction**: Mutate double-entry ledger balance atomically.
4. **Persist Snapshot**: Store committed response body against the key for 72 hours.
5. **Release Lock**: Allow subsequent queries to read committed response.
