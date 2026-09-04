# AML Disaster Recovery, Event Replay & Resilience

## 1. Event Replay Protocol
If the AML scenario worker experiences an outage or backlog:
1. Halt real-time ingestion queue into Dead-Letter Queue (DLQ).
2. Restore database state and replay unprocessed `aml_events` using unique `idempotency_key` and `transaction_id`.
3. Assert that alert deduplication suppresses redundant alerts while retaining full evidence snapshots.
4. Verify consistency between General Ledger transaction totals and AML monitored volumes.
