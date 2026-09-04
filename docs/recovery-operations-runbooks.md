# Transaction Recovery Daily Operational Runbooks

## 1. Daily Recovery Checklist
1. Review `UNKNOWN` Transaction Queue ($> 15\text{ minutes}$ aging).
2. Execute batch provider status inquiries for timed-out NIP / BCEAO transactions.
3. Review pending high-value refund approvals ($> \text{NGN } 1,000,000$).
4. Monitor statutory dispute response deadlines (SLA countdown $\le 24\text{ hours}$).
5. Verify zero unresolved settlement breaks.
