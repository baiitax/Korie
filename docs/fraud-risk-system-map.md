# Fraud & Risk Decision System Map

## 1. Architectural Mission
The **KoriePay Fraud & Risk Decision Engine** operates as an authoritative, low-latency, deterministic control plane that assesses risk across all financial transactions, entity interactions, device sessions, and network topologies across **Nigeria (NGN)** and **Niger Republic (XOF)**.

The engine strictly follows the separation of responsibilities:
```
FRAUD DETECTION → RISK ASSESSMENT → DECISIONING → COMPLIANCE REVIEW → TRANSACTION EXECUTION → SETTLEMENT → TREASURY → LIQUIDITY
```

- **Fraud/Risk Engine**: "How risky is this activity? Should it be allowed, stepped up, reviewed, held, declined, or blocked?"
- **Compliance Engine**: "Does this violate AML/CFT, Sanctions, PEP, or Regulatory rules?"
- **Core Financial Engine**: "What double-entry financial effects actually occurred?"
- **Reconciliation Engine**: "Does internal financial truth agree with external provider movements?"
- **Treasury Engine**: "Do we have sufficient safe liquidity to meet obligations?"

---

## 2. Core Control Plane Hierarchy

```
                                  KORIEPAY ECOSYSTEM
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
              Customer                 Agent                  Merchant
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         │
                                         ▼
                                Transaction Engine
                                         │
                                         ▼
                            FRAUD/RISK DECISION ENGINE
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
                 ▼                       ▼                       ▼
               Allow                   Review                 Decline
                 │                       │                       │
                 ▼                       ▼                       ▼
            Transaction             Compliance                 Block/
            Processing               Workflow               Restriction
                 │
                 ▼
                       CORE FINANCIAL ENGINE + LEDGER
                                         │
                                         ▼
                              SETTLEMENT ENGINE
                                         │
                                         ▼
                               TREASURY ENGINE
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
              Liquidity               Funding                 Settlement
             Monitoring               Planning               Obligations
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         ▼
                                LIQUIDITY DECISION
                                         │
                                         ▼
                             BANK / PROVIDER / CASH
```

---

## 3. Evaluated Entities & Vectors
The Fraud/Risk Engine continuously evaluates:
1. **Customers**: KYC Tier 1/2/3, account age, transaction frequency, behavioral anomalies.
2. **Agents**: Float cycling, cash-in/cash-out ratios, customer concentration, device sharing, off-hour velocity.
3. **Merchants**: Chargeback ratio, refund velocity, sudden volume spikes, transaction laundering indicators.
4. **Aggregators**: Sub-agent concentration, regional float shifts, downstream exception rates.
5. **Devices**: Device fingerprints, hardware UUIDs, root/jailbreak indicators, multi-account bindings.
6. **Network & Sessions**: IP addresses, ASNs, VPN/Tor/Proxy detection, geovelocity anomalies.
7. **Beneficiaries**: New beneficiary velocity, cross-entity reuse, high-risk counterparty flagging.
8. **BDC / FX Nodes**: Large single-ticket currency conversions, rapid spread arbitrage patterns.

---

## 4. Decision Pipeline & Action Outcomes
Every risk-sensitive operation passes through the 14-step evaluation pipeline:
1. **Request Intake & Context Extraction**
2. **Identity & KYC Confidence Verification**
3. **Device Risk Scoring**
4. **Session & Geolocation Analysis**
5. **Transaction Baseline Evaluation**
6. **Multi-Window Velocity Checks (1m, 10m, 1h, 24h, 7d)**
7. **Behavioral Anomaly Detection**
8. **Network Graph & Entity Linkage Check**
9. **AML & Compliance Signal Ingestion**
10. **Tiered Limits Verification**
11. **Heuristic & Machine Learning Rule Execution**
12. **Composite Score Computation (0–100 scale)**
13. **Risk Band Classification (`VERY_LOW`, `LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`, `CRITICAL`)**
14. **Deterministic Decision Execution**:
    - `ALLOW`: Low risk, processed immediately.
    - `ALLOW_WITH_STEP_UP`: Medium risk, requires 2FA / OTP / PIN / Biometric challenge.
    - `REVIEW`: Elevated risk, routed to Fraud Operations work queue.
    - `HOLD`: High risk, funds placed on `RISK_HOLD` in the Core Financial Engine.
    - `DECLINE`: Critical risk, transaction rejected with sanitized customer message.
    - `BLOCK`: Malicious activity, entity/device blacklisted and reported.
