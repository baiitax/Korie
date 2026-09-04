# Enterprise Event Bus, Transactional Outbox & Dead-Letter Queues

## 1. Transactional Outbox Pattern

To prevent dual-write anomalies where a database transaction succeeds but an event publishing call fails, KoriePay implements the **Transactional Outbox Pattern**:

```
[Core Domain Action (e.g. Ledger Post)]
                  │
                  ▼ (Atomic Single DB Transaction)
┌─────────────────┴───────────────────┐
│ 1. Write Journal Lines to Ledger    │
│ 2. Insert Event into `event_outbox` │
└─────────────────┬───────────────────┘
                  │ Commit
                  ▼
[Background Outbox Relay Worker]
                  │
                  ▼ (Publishes to Event Bus)
[Enterprise Event Bus] ──▶ [Consumers: Fraud / AML / Webhook Dispatcher / Marts]
```

---

## 2. Event Typing & Schema Versioning

All published events adhere to structured JSON Schema definitions:
- **`payment.created.v1`**: Initial payment initiation record.
- **`payment.completed.v1`**: Successful settlement with final ledger journal ID.
- **`transfer.failed.v1`**: Failed execution with standardized error code.
- **`settlement.cleared.v1`**: Partner net settlement credit completed.

---

## 3. Dead-Letter Queue (DLQ) & Deterministic Replay

- **DLQ Threshold**: If a consumer fails to acknowledge an event after 5 exponential retries (1s, 5s, 30s, 2m, 10m), the event payload is moved to `event_dead_letters`.
- **Governed Replay**: Authorized engineers can inspect the root cause, fix downstream consumer issues, and trigger idempotent replay without duplicating financial side-effects.
