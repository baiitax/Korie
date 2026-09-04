# AML Scenario Catalog & Detection Rules

## 1. Scenario Library Specification

| Code | Scenario Name | Category | Thresholds & Windows | Escalation |
|---|---|---|---|---|
| `AML_STRUC_01` | Structuring / Smurfing | Typology | $\ge 3$ transfers within 10% below CBN/BCEAO threshold in 24h | P1 Alert $\to$ Case |
| `AML_RAPID_01` | Rapid Movement of Funds / Pass-Through | Flow | $\ge 90\%$ of inbound funds transferred out within 60 minutes | P0 Alert $\to$ Auto-Review |
| `AML_VELOC_01` | Unusual Transaction Velocity | Velocity | $> 5\times$ customer 30-day declared baseline | P2 Alert |
| `AML_DORM_01` | Dormant Account Sudden Inflow | Lifecycle | $> 180$ days dormancy followed by transaction $> \text{NGN } 1,000,000$ | P1 Alert $\to$ Case |
| `AML_CASH_01` | Agent Unusual Cash Deposit Spike | Cash | Cash-in velocity exceeding physical float ceiling by $> 200\%$ | P1 Alert $\to$ Agent Desk |
| `AML_CIRC_01` | Circular Transaction Ring | Graph | $A \to B \to C \to A$ closed loop transfer within 48h | P0 Alert $\to$ Case |
| `AML_MULE_01` | Account Takeover / Mule Pattern | Fraud/AML | New device + SIM change + beneficiary add + max transfer in 2h | P0 Alert $\to$ Immediate Hold |
| `AML_CROSS_01` | Correlated NGN ➔ XOF Arbitrage | Cross-Border | Unregistered BDC high-velocity cross-border FX swaps | P1 Alert $\to$ STR Queue |

---

## 2. Versioning & Simulation
Every scenario is explicitly versioned (e.g. `AML_RAPID_01_V2`). Threshold modifications run against historical transaction datasets in simulation mode before production rollout.
