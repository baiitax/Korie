# Compliance Disaster Recovery & Regulatory Incident Playbook

## Incident Classification
- **Level 1 (Critical Emergency)**: Regulatory inspection notice, court-ordered immediate freezing mandate, or major systemic AML breach.
- **Level 2 (High Severity)**: Sanctions screening API provider downtime, bulk KYC verification backlog exceeding 48h SLA.
- **Level 3 (Moderate)**: Individual false positive dispute or scheduled policy revision delay.

## Emergency Freezing Protocol
1. **Immediate Execution**: Authorized MLRO activates Emergency Freeze via `/compliance/restrictions` or terminal command.
2. **Ledger Lock**: Core payment gateway rejects all debit/credit settlement instructions referencing target account ID with code `ERR_COMPLIANCE_FREEZE_ENFORCED`.
3. **Regulatory Notification**: Automated STR or court acknowledgement dispatch initiated to NFIU / CENTIF within 2 hours.
4. **Post-Incident Audit**: Full chronological timeline and evidence vault exported for board review.
