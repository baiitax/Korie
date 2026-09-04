# AML Transaction Monitoring & Financial Crime Control Architecture

## 1. Domain Boundaries & System of Record
The KoriePay AML Platform is a real-time, event-driven financial crime control plane that consumes authoritative data across KoriePay without owning core financial truth:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AUTHORITATIVE SOURCES                         │
│  • Identity/KYC Master  • Customer & Account  • Payment Switch Execution│
│  • Core Double-Entry Ledger (GL/Subledgers)   • Agent Fleet Telemetry   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Normalized Event Stream
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AML FINANCIAL CRIME PIPELINE                     │
│  1. Event Normalization & Minor Units Ingestion                         │
│  2. Behavioral Feature Generation vs Expected Activity Profile          │
│  3. Versioned Scenario Rule Engine (Structuring, Velocity, Graph)      │
│  4. Explainable Alert Generation & Deduplication Clustering             │
│  5. Prioritization Matrix (P0 Critical -> P3 Low)                      │
│  6. Case Management & Immutable Investigation Workbench                 │
│  7. Controlled Account Action Gateway (Non-Destructive)                 │
│  8. Sovereign Regulatory Filing Work Queue (NFIU / CENTIF / STR)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariants Enforced
1. **Explainability Invariant**: Every alert answers `WHAT`, `WHY`, `WHEN`, `WHO`, `HOW MUCH`, `HOW`, and `AGAINST WHAT RULE VERSION`.
2. **Double-Entry Protection**: AML decisions never directly alter ledger balances. Financial restrictions route through the Account Authorization Gateway.
3. **Immutability of Audit**: Alert history, case decisions, and investigator notes are strictly append-only and cryptographically auditable.
