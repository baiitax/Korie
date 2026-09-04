# Financial Events & Outbox Architecture

## 1. Event Sourcing & Ledger Event Stream
Every financial mutation produces an immutable domain event.
- `financial.journal.posted`
- `financial.journal.reversed`
- `financial.hold.placed`
- `financial.hold.released`
- `financial.settlement.batched`
- `financial.settlement.settled`
- `financial.suspense.parked`
- `financial.daily_close.completed`

## 2. Transactional Outbox Pattern
To eliminate dual-write failure vulnerabilities between the database and message broker:
1. The double-entry journal posting and outbox event are committed inside a **single ACID database transaction**.
2. An asynchronous worker daemon scans the outbox table for `PENDING` records.
3. External webhooks and partner dispatch calls are performed with exponential backoff and jitter.
4. Upon delivery confirmation, the record status is updated to `DELIVERED`.
