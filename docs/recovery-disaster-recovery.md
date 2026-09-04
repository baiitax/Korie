# Disaster Recovery & State Reconciliation Runbook

## 1. Post-Outage Transaction State Reconciliation
When restoring core payment services after an infrastructure outage:
1. Lock all automatic outbound retry workers.
2. Query the Outbox and Webhook Inbox for unacknowledged provider callbacks.
3. Mark all in-flight pending transactions as `UNKNOWN`.
4. Run batch `queryTransactionStatus()` against Providus Bank NG and Koris Bank NE gateway endpoints.
5. Apply double-entry compensating journals for confirmed failures that previously held debits.
6. Verify balance consistency between the General Ledger and Customer Wallets before lifting gateway holds.
