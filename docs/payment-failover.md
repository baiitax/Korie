# Payment Failover, Circuit Breaking & Dead-Letter Handling

## 1. Autonomous Failover Protocol
When routing payments through Tier-1 banking switches:
1. **Definitive Declines** (e.g. `ACCOUNT_BLOCKED`, `INVALID_DESTINATION_ACCOUNT`): Fail immediately; do not retry.
2. **Transient Network Errors** (e.g. Socket Hangup, HTTP 503):
   - Check Circuit Breaker status of primary node.
   - If Attempt #1 has **no ambiguous debit footprint**, transition to Attempt #2 using the pre-configured secondary node.
   - If status is unknown, **freeze execution** and move payment to `PENDING_RECONCILIATION`.

---

## 2. Dead-Letter Queue (DLQ) Strategy
Unresolvable attempts and dropped webhooks are diverted to the resilient Dead-Letter Queue. Operators can trigger replay through the Admin Command Center with guaranteed idempotency:
- DLQ entries store the full request payload, provider headers, timestamp, error trace, and parent payment UUID.
- Batch replay utilizes the original `Idempotency-Key` to guarantee zero double-crediting.
