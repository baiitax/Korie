# Transaction State Machine & Ledger Lifecycle

## 1. State Lifecycle Overview
Financial transactions move through a deterministic state machine:

```
[ INITIATED ]
      │
      ▼
[ PENDING_VALIDATION ] ──► [ REJECTED ] (Insufficient funds / Sanctions)
      │
      ▼
[ HELD / RESERVED ] (Balance locked in account_holds)
      │
      ▼
[ POSTING_LEDGER ] ─────► [ POSTED ] (Immutable journal created)
      │
      ▼
[ DISPATCHING_OUTBOX ] ──► [ SETTLED ] (External bank rail confirmed)
      │
      ▼ (Timeout / Failure)
[ SUSPENSE_PARKED ] ───► [ REVERSED / REFUNDED ]
```

## 2. Decoupling Provider Status from Ledger Truth
1. **Inward Deposits**: Funds are placed in suspense (`7100`) until provider signature and amount are cryptographically verified.
2. **Outward Transfers**: Balances are held via `account_holds`. Upon final bank rail success (`200 OK` from Providus/Coris), the hold is captured and posted.
3. **Timeouts**: If a bank network drops connection, transactions transition to `SUSPENSE_PARKED` rather than failing, preventing double-debits or customer losses.
