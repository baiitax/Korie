# Durable Idempotency Engine, Circuit Breakers & Unknown Handling

## 1. Durable Financial Idempotency Protocol

To prevent double-debiting or duplicated payouts across asynchronous banking networks, all financial mutation requests require an `Idempotency-Key` header:

```
[Inbound Request with `Idempotency-Key: idemp-8921-xyz`]
                     │
                     ▼
       ┌─────────────────────────────┐
       │ Compute SHA-256 of Payload  │
       └─────────────┬───────────────┘
                     ▼
       ┌─────────────────────────────┐
       │ Lookup in Idempotency Store │
       └─────────────┬───────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   [Key Found]              [Key Not Found]
         │                       │
         ├──────────────────────┐└──────────────┐
         ▼                      ▼               ▼
[Payload Hash Matches] [Payload Hash Mismatch] [Execute Request & Store]
         │                      │               │
         ▼                      ▼               ▼
[Return Cached Response] [Return 409 Conflict]  [Return Authoritative Result]
```

---

## 2. Circuit Breakers (`CLOSED`, `OPEN`, `HALF_OPEN`)

Provider adapters (e.g., Providus Bank NIP outward API) are protected by stateful circuit breakers:
- **`CLOSED` (Normal)**: 100% of traffic routes normally.
- **`OPEN` (Tripped)**: If failure/timeout rate exceeds 5.0% over rolling 60 seconds, circuit trips to `OPEN`. Traffic fails fast or diverts to secondary rails without hammering degraded bank nodes.
- **`HALF_OPEN` (Probe)**: After a 30-second cooldown, probe requests test upstream stability before resuming full traffic.

---

## 3. Unknown Transaction State Protocol

If an upstream banking node times out (HTTP 504 Gateway Timeout), the gateway **NEVER** marks the transaction as `FAILED`. It assigns status `UNKNOWN / PROVIDER_PENDING` and dispatches a background status query worker to verify ledger reconciliation before any reversal or refund is considered.
