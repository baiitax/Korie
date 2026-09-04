# KORIEPAY API ERROR CODES & DIAGNOSTICS REFERENCE

## 1. Standard Error Schema
All error responses adhere to RFC-7807 problem details:

```json
{
  "status": "error",
  "code": "INSUFFICIENT_FUNDS",
  "message": "Available balance (₦1,240.00) is insufficient for transaction amount ₦50,000.00 + fee ₦250.00.",
  "request_id": "KP-REQ-99281a04",
  "timestamp": "2026-09-03T16:15:00Z"
}
```

---

## 2. Standard Public Error Codes

| Code | HTTP Status | Category | Description & Recommended Fix |
|---|---|---|---|
| `UNAUTHORIZED_KEY` | 401 | AUTH | Secret key is missing or invalid. Verify header token. |
| `UNAUTHORIZED_SCOPE` | 403 | AUTH | Key lacks required scope. Add permission scope in Key Vault. |
| `INSUFFICIENT_FUNDS` | 400 | LEDGER | Source wallet balance too low. Top up balance. |
| `INVALID_AMOUNT` | 422 | VALIDATION | Amount must be an integer >= 100 minor currency units. |
| `RATE_LOCK_EXPIRED` | 422 | PROVIDER | 60s FX lock expired. Call `/v1/fx/quote` for fresh quote. |
| `DUPLICATE_IDEMPOTENCY_KEY`| 409 | LEDGER | Request with identical Idempotency-Key currently executing. |
| `UPSTREAM_SWITCH_TIMEOUT` | 504 | PROVIDER | Providus/Koris bank node delay. Check `/v1/payments/{ref}/verify`. |
