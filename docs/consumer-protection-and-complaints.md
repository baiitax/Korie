# Consumer Protection & Complaints Management Platform

## 1. Statutory Consumer Rights Framework
Compliant with CBN Consumer Protection Framework (Nigeria) and BCEAO Consumer Financial Directives (Niger Republic):
1. **Fee Transparency**: Real-time breakdown of transaction charges, VAT, and interchange before confirmation.
2. **Deterministic Reversals**: Failed switch transfers must be refunded or placed on documented hold within statutory SLAs.
3. **Traceable Redress**: Guaranteed right to submit, track, and escalate complaints with immutable dispute case IDs.

---

## 2. Complaint Lifecycle & SLA Clocks
```
OPENED ──> ACKNOWLEDGED ──> CLASSIFIED ──> INVESTIGATING ──> RESOLUTION_PROPOSED ──> RESOLVED ──> CLOSED
```

| Priority | Category | Statutory SLA Target | Escalation Trigger |
|---|---|---|---|
| **P0 (Critical)** | Duplicate Debit / Unauthorized Transaction | 24 Hours | 18 Hours Elapsed |
| **P1 (High)** | Agent Overcharging / Cash Misappropriation | 48 Hours | 36 Hours Elapsed |
| **P2 (Medium)** | POS Terminal Failure / Missing Settlement | 72 Hours | 60 Hours Elapsed |
| **P3 (Standard)** | General Inquiry / Service Account Issue | 5 Days | 4 Days Elapsed |

---

## 3. Financial Redress & Compensating Ledger Posting
The Consumer Protection platform **never directly updates wallet balances**. All approved financial compensations, goodwill credits, and fee refunds issue balanced journal commands to the Core Financial Ledger:
- **Dr**: `Expense / Customer Compensation (5090)` or `Operational Suspense (7010)`
- **Cr**: `Customer Stored-Value Wallet (2010 / 2020)`
- **Linked Reference**: `COMPLAINT_ID` $\longrightarrow$ `DISPUTE_ID` $\longrightarrow$ `GL_JOURNAL_ID`
