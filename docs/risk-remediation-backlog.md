# Risk Remediation Backlog

## Remediation Roadmap

- **RSK-01 (P0 - Implemented)**: Build Core `RiskDecisionEngine.ts` with 14-step pipeline and composite scoring (0-100).
- **RSK-02 (P0 - Implemented)**: Create immutable `risk_decisions` logging with rule-hit breakdowns.
- **RSK-03 (P1 - Implemented)**: Implement `VelocityEngine.ts` supporting 1m, 10m, 1h, 24h, and 7d rolling windows.
- **RSK-04 (P1 - Implemented)**: Build `FraudCaseManagementEngine.ts` with automated SLA tracking and Maker-Checker resolution.
- **RSK-05 (P1 - Implemented)**: Implement `EntityRiskProfilingEngine.ts` with device fingerprinting and network graph relationships.
- **RSK-06 (P2 - Implemented)**: Create REST API endpoints under `/api/core/v1/risk/` for evaluate, decisions, cases, holds, and rules.
- **RSK-07 (P2 - Implemented)**: Build high-density Admin Risk Command Center at `/admin/risk`.
