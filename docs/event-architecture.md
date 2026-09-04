# KORIEPAY EVENT-DRIVEN ARCHITECTURE & OUTBOX PATTERN

## 1. Outbox Pattern Guarantees
To prevent the dual-write problem (database updated but message broker unavailable), all domain events are written to the `public.outbox_events` table inside the identical PostgreSQL transaction.

```
                      API Transaction Boundary
           ┌─────────────────────────────────────────────┐
           │ 1. Mutate Double-Entry Ledger               │
           │ 2. Create Canonical Transaction Record      │
           │ 3. Insert Outbox Event (Status: PENDING)    │
           │ 4. COMMIT DATABASE TRANSACTION              │
           └─────────────────────────────────────────────┘
                                  │
                                  ▼
                     +──────────────────────────+
                     |    ASYNC OUTBOX WORKER   |
                     | Polls PENDING & Publishes|
                     +──────────────────────────+
                                  │
                                  ▼
                     +──────────────────────────+
                     | Mark Event as PUBLISHED  |
                     +──────────────────────────+
```

---

## 2. Standard Domain Events
- `transfer.created`, `transfer.successful`, `transfer.failed`
- `payment.successful`, `payment.reversed`
- `wallet.credited`, `wallet.debited`, `wallet.hold_placed`
- `kyc.verification.completed`, `kyc.verification.failed`
