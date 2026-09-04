# Compliance Case Management Lifecycle & Investigation Workflow

## Investigation Stages
1. **Intake & Triage (`OPEN`)**: Case initiated via automated AML threshold breach, sanctions hit, or investigator manual discovery. Priority SLA assigned (Urgent: 24h, High: 48h, Medium: 72h).
2. **Investigation & Discovery (`UNDER_REVIEW`)**: Assigned compliance officer inspects ledger transaction history, counterparty clusters, geolocations, and KYC documents.
3. **Evidence Vaulting**: Officer deposits bank statements, verified invoices, passports, and interview records into the SHA-256 secure evidence repository.
4. **Escalation (`ESCALATED`)**: High-risk findings or potential regulatory disclosures are escalated to the Money Laundering Reporting Officer (MLRO) / Head of Compliance.
5. **Ruling & Statutory Filing (`RESOLVED` / `CLOSED`)**: Final formal disposition recorded. If suspicious activity is affirmed, automated Suspicious Transaction Report (STR) payload is generated for NFIU GoAML or CENTIF portal.

```
+--------+       +--------------+       +-------------+       +-------------------+
|  OPEN  | ----> | UNDER_REVIEW | ----> |  ESCALATED  | ----> | RESOLVED / CLOSED |
+--------+       +--------------+       +-------------+       +-------------------+
                       |                       |                        |
                       v                       v                        v
                [Evidence Vault]       [Confidential Note]      [NFIU / CENTIF STR]
```
