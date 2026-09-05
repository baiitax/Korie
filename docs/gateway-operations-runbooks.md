# Integration Operations, Kill-Switches & Incident Runbooks

## 1. Emergency Gateway Kill-Switches
In the event of upstream provider compromise, severe latency degradation, or partner abuse:
- `GLOBAL_GATEWAY_PAUSE`: Rejects new inbound requests with `HTTP 503 SERVICE_UNAVAILABLE` while draining in-flight payments.
- `PARTNER_SUSPENSION`: Immediately revokes partner tokens and stops new API invocations.
- `PROVIDER_ROUTE_BLOCK`: Diverts traffic away from degraded banking nodes (e.g. Providus NG or Coris NE) to backup settlement rails.

---

## 2. Daily Gateway Operations Checklist
1. Inspect Gateway latency percentiles ($p50 < 150\text{ms}, p99 < 800\text{ms}$).
2. Review Dead-Letter Queue (DLQ) for unacknowledged partner webhooks.
3. Check Provider Circuit Breakers status (`CLOSED` vs `OPEN`).
4. Audit expiring API credentials within the next 14 days.
