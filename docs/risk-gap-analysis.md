# Risk Gap Analysis & Remediation Strategy

## 1. Audit Findings & Severity Classification

| Gap ID | Severity | Description | Remediation Architecture |
|---|---|---|---|
| `GAP-RSK-01` | **P0** | UI-driven risk alert cards had mock static data and lacked a real-time deterministic scoring engine. | Built `RiskDecisionEngine.ts` with 14-step synchronous pipeline and composite scoring (0-100). |
| `GAP-RSK-02` | **P0** | Risk holds could be released without Maker-Checker segregation. | Implemented Dual-Key Maker-Checker workflow on hold releases and audit logging. |
| `GAP-RSK-03` | **P1** | Lack of multi-window velocity tracking across entity, device, and network scopes. | Built `VelocityEngine.ts` supporting 1m, 10m, 1h, 24h, and 7d rolling aggregation. |
| `GAP-RSK-04` | **P1** | Fraud cases lacked explicit SLA tracking and evidence bundling. | Built `FraudCaseManagementEngine.ts` with automated case generation and SLA countdown. |
| `GAP-RSK-05` | **P2** | Device and IP network graph intelligence was unlinked to transaction history. | Built `EntityRiskProfilingEngine.ts` maintaining device fingerprints and relationship links. |
