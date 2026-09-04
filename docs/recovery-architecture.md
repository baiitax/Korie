# Transaction Recovery, Dispute, Refund & Reversal Architecture

## 1. Multi-Dimensional Transaction State Model
In KoriePay's Tier-1 core banking architecture, transactions maintain discrete, decoupled state dimensions that are never collapsed into a simplistic binary status:

```
+-----------------------------------------------------------------------------------------+
|                                    TRANSACTION TRUTH                                    |
+-----------------------------------------------------------------------------------------+
|  PAYMENT STATE       : INITIATED | PROCESSING | PROVIDER_PENDING | SUCCESS | UNKNOWN    |
|  FINANCIAL STATE     : UNPOSTED | POSTED | COMPENSATED | REVERSED                       |
|  SETTLEMENT STATE    : UNSETTLED | PENDING | SETTLED | FAILED                           |
|  RECONCILIATION STATE: UNMATCHED | MATCHED | RECONCILED | EXCEPTION_BREAK               |
|  DISPUTE STATE       : NONE | OPENED | UNDER_REVIEW | RESOLVED_CUSTOMER | CHARGEBACK    |
|  RECOVERY STATE      : NOT_REQUIRED | DETECTED | QUEUED | REVERSING | RESOLVED          |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Domain Ownership & Boundaries
- **Payment Switch**: Owns route determination, upstream provider invocation, and attempt tracking.
- **Double-Entry General Ledger**: Owns immutable double-entry journal postings, balances, and compensating entries. The Recovery engine *never* directly manipulates ledger balances outside the authorized posting gateway.
- **Settlement Engine**: Owns batch clearing cycles with Providus Bank (NGN) and Koris Bank (XOF).
- **Recovery Engine**: Owns uncertain transaction resolution, provider status inquiry workflows, safe retries, and automated reversals.
- **Dispute & Chargeback Engine**: Owns customer/merchant claim dossiers, hash-verified evidence vaults, representment workflows, and SLA clocks.

---

## 3. The UNKNOWN State Invariant
A network or provider HTTP timeout $\neq$ payment failure.
When an upstream provider times out:
1. Transaction state is set to `UNKNOWN`.
2. A `transaction_recovery_case` is queued.
3. Automated status query adapter executes `queryTransactionStatus()`.
4. Only upon deterministic confirmation is the payment transitioned to `SUCCESS` or compensating financial posting applied.
