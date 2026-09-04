# Payment State Machine & Status Normalization

## 1. Orthogonal Four-State Representation
To eliminate financial ambiguity, every payment tracks four independent lifecycle states:

```
┌─────────────────────────┐     ┌─────────────────────────┐
│     BUSINESS STATE      │     │     FINANCIAL STATE     │
│  - INITIATED            │     │  - UNPOSTED             │
│  - PENDING              │     │  - HELD                 │
│  - PROCESSING           │     │  - POSTED               │
│  - SUCCESSFUL           │     │  - PARTIALLY_REVERSED   │
│  - FAILED               │     │  - FULLY_REVERSED       │
│  - CANCELLED / REVERSED │     └─────────────────────────┘
└─────────────────────────┘
            │                                │
            ▼                                ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    SETTLEMENT STATE     │     │  RECONCILIATION STATE   │
│  - UNSETTLED            │     │  - UNRECONCILED         │
│  - IN_SETTLEMENT        │     │  - MATCHED              │
│  - SETTLED              │     │  - MISMATCH             │
│  - PARTIALLY_SETTLED    │     │  - EXCEPTION            │
│  - SETTLEMENT_EXCEPTION │     │  - MANUAL_REVIEW        │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 2. Business Status Normalization Rules

| Provider Code / String | Normalized KoriePay Status | Financial Action Triggered |
|---|---|---|
| `00`, `SUCCESS`, `COMPLETED`, `PAID` | `SUCCESSFUL` | Post balanced Journal to General Ledger (`POSTED`) |
| `09`, `PENDING`, `IN_PROGRESS`, `TIMEOUT` | `PENDING` | Place funds on `HELD` in Subledger; schedule polling daemon |
| `51`, `INSUFFICIENT_FUNDS` | `FAILED` | Release reservation lock; no journal posted |
| `91`, `SYSTEM_ERROR`, `NETWORK_FAIL` | `PENDING` (Unknown) | Retain attempt; hold funds pending reconciliation query |
| `REV`, `REVERSED` | `REVERSED` | Post compensating reversal journal entry |
