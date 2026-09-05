# Support Operations Runbook & Disaster Recovery

## Operational Incident Procedures
1. **Detecting Major Gateway Outage**:
   - Inbound ticket velocity spikes by >300% on category `PENDING_TRANSACTION` or `FAILED_TRANSACTION`.
   - Supervisor immediately verifies Providus / Coris node health in the Banking Rails monitor.
   - Declare Parent Incident via `/support/incidents`.
2. **Customer Communication Protocol**:
   - Activate Approved Incident Advisory ribbon on in-app chat and web portals.
   - Frontline junior officers apply Macro Incident Reassurance to all incoming tickets.
3. **Reconciliation & Auto-Reversals**:
   - Finance Operations triggers automated transaction status queries (TSQ) every 15 minutes.
   - Unacknowledged debits are automatically reversed to customer wallets upon final switch timeout.
