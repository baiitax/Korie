# Business Continuity Plan (BCP) & Crisis Operations

## 1. Governance & Crisis Management Team (CMT)

| Role | Primary Responsible | Backup Responsible | Responsibilities |
|---|---|---|---|
| **Incident Commander** | VP of Engineering | Head of Infrastructure | Overall technical recovery coordination and executive briefings |
| **Financial Integrity Lead**| Chief Financial Officer | Head of Treasury | Authorization of balance reconciliations and treasury rebalancing |
| **Risk & Compliance Lead** | Chief Risk Officer / MLRO | Senior AML Manager | Sanction screenings, fraud containment, and regulatory notifications (NFIU/CENTIF) |
| **Operations Lead** | Head of Customer Support | Agency Operations Lead | Merchant/Agent communications and ticket queue triage |

---

## 2. Emergency Operational Modes

### Mode 1: Standard Operational Mode
- All systems online, automated instant settlement and real-time processing enabled.

### Mode 2: Degraded Provider Mode (Single Banking Outage)
- Specific provider marked `DEGRADED`; transfers routed to secondary rail or queued with transparent user messaging ("Processing via secondary switch").

### Mode 3: Financial Safe Mode (Core Ledger / Database Anomaly)
- Outbound financial mutations locked immediately; read-only balance queries, receipt views, and support inquiries remain accessible.

### Mode 4: Full Emergency Recovery Mode (Disaster Recovery Active)
- PITR database restoration in progress; public APIs return `HTTP 503 Service Unavailable` with retry-after header until 7-step integrity validation passes.
