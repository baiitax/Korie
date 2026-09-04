# Account Lifecycle & Fine-Grained Restrictions

## 1. Multi-State Transition Invariants
- `OPEN`: Unrestricted transactions permitted up to configured product limits.
- `RESTRICTED`: Specific transaction capabilities selectively disabled:
  - `DEBIT_ONLY`: Account can receive inbound funds, but outward transfers are blocked.
  - `CREDIT_ONLY`: Account can disburse funds, but deposits are disabled.
  - `TRANSFER_DISABLED`: P2P and NIP interbank transfers disabled.
  - `DEVICE_RESTRICTED`: Account only accessible via pre-registered hardware.
- `FROZEN`: Complete operational lock; balances and transaction histories preserved.
- `DORMANT`: Inactive for $>180$ days; requires step-up identity check to reactivate.
- `CLOSURE_PENDING`: Awaiting zero-balance resolution and settlement reconciliation.
- `CLOSED`: Immutable historical termination; no further debits or credits permitted.
