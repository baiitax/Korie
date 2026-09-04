# Agency Banking Operations & Emergency Runbooks

## 1. Daily Field Operations Checklist
1. Inspect Agent fleet connectivity and terminal heartbeats.
2. Review low-float alerts and coordinate liquidity rebalancing with Treasury.
3. Audit cash reconciliation exceptions (short/over cash drawers).
4. Monitor P0 consumer complaints approaching 24h statutory resolution SLA.

---

## 2. Emergency Stolen Terminal & Compromise Runbook
When a POS terminal is reported lost, stolen, or compromised:
1. Trigger Remote Terminal Suspension via Agency Command Center.
2. The Engine immediately:
   - Sets Terminal state to `STOLEN` / `SUSPENDED`.
   - Revokes active session tokens on the bound device.
   - Rejects all subsequent channel authorization requests with `TERMINAL_RESTRICTED`.
   - Emits high-priority security event to SOC.
