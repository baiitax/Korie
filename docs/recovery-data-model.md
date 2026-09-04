# Transaction Recovery & Dispute Relational Schema

## 1. Schema Tables Overview

### Recovery & Attempts
- `transaction_recovery_cases`: Tracks ambiguous/failed transactions with exposure amounts, assigned teams, and SLA clocks.
- `transaction_execution_attempts`: Immutable history of every upstream provider dispatch (latency, response code, retry count).
- `provider_status_queries`: Log of automated and manual status inquiries.

### Refunds & Reversals
- `payment_refunds`: Full and partial refund requests, approved amounts, and remaining eligible balances.
- `payment_reversals`: Compensating reversal events linked to original journal transactions.

### Disputes & Chargebacks
- `disputes`: Customer, merchant, and agent dispute cases, categories, and claim amounts.
- `dispute_evidence`: SHA-256 hash-verified evidence files with chain-of-custody tracking.
- `chargebacks`: External network chargeback records, representment dossiers, and arbitration outcomes.
- `financial_exceptions`: Universal exception hub connecting reconciliation breaks, unknown states, and settlement errors.
