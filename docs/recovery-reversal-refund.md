# Reversal & Refund Engines Specification

## 1. Reversal Accounting Treatment
A reversal is never a database `DELETE` or silent mutation. It creates an immutable compensating financial journal entry:

### Original Transfer Journal:
- **Debit**: Customer Wallet Subledger (`2010`)
- **Credit**: Provider Clearing Account (`1030`)

### Compensating Reversal Journal:
- **Debit**: Provider Clearing Account (`1030`)
- **Credit**: Customer Wallet Subledger (`2010`)
- **Reference**: `ORIGINAL_TXN_REF` + `REVERSAL_ID`

---

## 2. Server-Side Refund Protection
- **Double-Refund Prevention**: Atomically locks target transaction row (`SELECT ... FOR UPDATE`) and computes `remaining_refundable_amount`.
- **Partial Refund Support**: Permits $N$ sequential partial refunds as long as $\sum \text{Refunds} \le \text{Original Transaction Volume}$.
- **Maker-Checker Dual Authorization**: High-value refunds ($> \text{NGN } 1,000,000$ or $> \text{XOF } 2,000,000$) require explicit supervisor sign-off before dispatching.
