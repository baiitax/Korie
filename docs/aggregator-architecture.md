# KORIEPAY AGGREGATOR ARCHITECTURE
## Technical Topology, Component Architecture & Security Boundaries

---

## 1. Component Layering

```
+----------------------------------------------------------------------------------------------------+
|                                    KORIEPAY AGGREGATOR SHELL                                       |
|                     (Desktop Command Center / Tablet View / Mobile Nav Shell)                      |
+----------------------------------------------------------------------------------------------------+
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 ▼                                ▼                                ▼
   +───────────────────────────+    +───────────────────────────+    +───────────────────────────+
   |   NETWORK DISTRIBUTION    |    |   FINANCIAL & LIQUIDITY   |    |    RISK & COMPLIANCE      |
   | • Agents Directory        |    | • Central Float Wallet    |    | • Velocity Anomaly Engine |
   | • Merchant Acquiring      |    | • Agency Rebalancing Desk |    | • KYC/KYB Document Queue  |
   | • Territory Supervision   |    | • NIBSS Batch Settlements |    | • Operational Exceptions  |
   +───────────────────────────+    +───────────────────────────+    +───────────────────────────+
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  ▼
                       +──────────────────────────────────────────────────+
                       |           AUTHORITATIVE AGGREGATOR LEDGER        |
                       |       (Dual-Entry, Immutable, Multi-Currency)   |
                       +──────────────────────────────────────────────────+
```

---

## 2. Security Boundaries & Authorization Scopes

- **Aggregation Scoping:** Aggregator queries are strictly constrained by `aggregator_id`, preventing cross-aggregator data leakage.
- **Role Permissions:** Granular permissions (`ALL_ACCESS`, `AUTHORIZE_LIQUIDITY_DISPATCH`, `VIEW_FINANCIALS`, `RESOLVE_EXCEPTIONS`) enforced server-side.
- **Maker-Checker Dual Control:** Liquidity dispatches exceeding ₦500k require PIN/OTP confirmation.
- **Masked Data:** Card PANs, personal BVN/NIN identifiers, and API secrets are never exposed in plaintext in the client layer.
