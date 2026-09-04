# Financial Reconciliation & Discrepancy Accounting

## 1. 3-Way Matching Invariant
Reconciliation requires continuous automated comparison across:
1. **Internal Switch Journal / Attempt Record**
2. **Core General Ledger Account Postings**
3. **External Bank / Network Switch Statements (Providus, NIBSS, Koris, Interswitch)**

---

## 2. Discrepancy Resolution Protocol
- **Timing Mismatch**: In-flight settlement settled within 24 hours is automatically matched.
- **Amount Mismatch**: Variance routed to `7020 (Settlement Exception Suspense)` for manual audit.
- **Missing External**: Payment succeeded internally but not found on bank statement triggers automatic bank query API call.
- **Unrecognized Inflow**: Unsolicited direct bank transfer routed to `7010 (Operational Suspense)` awaiting customer attribution.
