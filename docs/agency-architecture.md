# Agency Banking & Physical Channel Control Plane Architecture

## 1. Agency Banking Ecosystem & Governance Perimeter
KoriePay's Agency Banking Platform establishes an institutional-grade control plane governing physical and assisted financial distribution across Nigeria (NGN) and Niger Republic (XOF).

```
+-----------------------------------------------------------------------------------------+
|                                    KORIEPAY ECOSYSTEM                                   |
|                                            │                                            |
|                                            ▼                                            |
|                              AGGREGATOR / SUPER AGENT HIERARCHY                         |
|                                            │                                            |
|                                            ▼                                            |
|                                     AGENT LOCATION                                      |
|                                            │                                            |
|                      ┌─────────────────────┴─────────────────────┐                      |
|                      ▼                                           ▼                      |
|             [DEVICE TRUST ENGINE]                      [TERMINAL REGISTRY]              |
|             (Hardware Fingerprint &                    (POS Serial, Custody,            |
|              Attestation Posture)                       Capability Profile)             |
|                      │                                           │                      |
|                      └─────────────────────┬─────────────────────┘                      |
|                                            │                                            |
|                                            ▼                                            |
|                               CHANNEL AUTHORIZATION ENGINE                              |
|                         (Agent + Device + Terminal + Location)                          |
|                                            │                                            |
|                                            ▼                                            |
|                              LIMIT / RISK / AML EVALUATION                              |
|                                            │                                            |
|                                            ▼                                            |
|                               DOUBLE-ENTRY GENERAL LEDGER                               |
|                         (Float Subledger & Compensating Journals)                       |
|                                            │                                            |
|                                            ▼                                            |
|                        CONSUMER PROTECTION & REGULATORY REPORTING                       |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Inviolable Domain Invariants
1. **Physical Cash $\neq$ Digital Float**: The platform strictly tracks electronic float balances separately from physical cash drawers, cash-in-transit, and bank vault settlements.
2. **Channel Authorization Gating**: No transaction executes on a POS terminal or mobile device without atomic verification of Agent status, Location geofencing, Device trust level, Terminal active state, and Limit Engine compliance.
3. **Core Ledger Authority**: Agent commissions, float top-ups, customer cash-in credits, and consumer redress compensations post strictly as balanced double-entry journals.
