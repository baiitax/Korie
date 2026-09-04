# Suspense Management & Aging Architecture

## 1. Purpose of Suspense Accounts
Suspense accounts isolate financial funds whose ownership or ultimate destination cannot be determined with certainty at the moment of ingestion.

## 2. Suspense Chart Accounts
- `7100` **Unallocated Inbound NIP Deposits Suspense**: Inbound bank transfers where the recipient virtual account or customer ID cannot be matched.
- `7200` **Failed Outbound Settlement Suspense**: Outbound customer withdrawals where the bank debited KoriePay's pool but the customer claims non-receipt.
- `7300` **Reconciliation Discrepancy Suspense**: Balance differences detected during end-of-day bank statement reconciliation.

## 3. Suspense Aging Buckets & Escalation SLAs
All open suspense items are evaluated against strict aging schedules:
| Aging Bucket | Urgency Level | Responsible Desk | Action Required |
|---|---|---|---|
| **0 – 1 Days** | Fresh | Automated Matcher Daemon | Re-query provider API and check pending webhook retry queues |
| **2 – 3 Days** | Pending | Treasury Ops Analyst | Contact commercial bank operations desk for switch query |
| **4 – 7 Days** | Escalated | Senior Clearing Officer | Initiate formal Interbank Settlement Dispute Ticket |
| **8 – 30 Days** | Critical | Chief Risk Officer / Finance Director | Reserve platform funds and notify compliance |
| **30+ Days** | Write-off Review | Executive Audit Committee | Requires Board-level authorization for write-off |
