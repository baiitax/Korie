# AML Incident Response Runbooks

## 1. Runbook: High-Velocity Mule Ring Detected
1. **Trigger**: `AML_MULE_01` or `AML_CIRC_01` generates a P0 Alert Cluster.
2. **Immediate Action**: AML Investigator opens case, reviews network graph to identify hub accounts.
3. **Control Action**: Request `TRANSFER_DISABLED` or `FULL_FREEZE` via Account Authorization Gateway.
4. **Escalation**: MLRO approves restriction via Maker-Checker.
5. **Filing**: Auto-populate STR work queue for NFIU / CENTIF submission within statutory SLA.
