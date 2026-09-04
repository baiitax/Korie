# KoriePay Compliance Architecture & Ledger Preservation Rules

## Fundamental Ledger Inviolability Principles
1. **Absolute Backend Preservation Rule**: The compliance subsystem sits as an immutable surveillance and supervisory layer over the core double-entry accounting ledger. Under no circumstances may compliance routines alter settled balance records retroactively.
2. **Read-Only Telemetry Ingestion**: Live transaction risk analysis ingests events via streaming Kafka/CDC pipelines without adding blocking latency to core payment processing paths.
3. **Dual-Key Ledger Restrictions**: When an enforcement action is approved (e.g. `TOTAL_FREEZE` or `POST_NO_DEBIT`), an atomic state flag is posted to the ledger node requiring cryptographic maker-checker signatures from authorized MLROs.

```
+-------------------------------------------------------------------+
|                  KoriePay Core Payment Engine                     |
+-------------------------------------------------------------------+
         |                                           ^
         | CDC Stream                                | Enforced
         v                                           | Restrictions
+-------------------------------------------------------------------+
|             Compliance & Financial Crime Engine                   |
|  - Real-Time AML Scoring    - Sanctions Watchlist Fuzzy Match     |
|  - KYC/KYB Due Diligence    - Maker-Checker Dual Control Matrix   |
|  - NFIU / CENTIF Reporting  - Chronological Investigation Vault   |
+-------------------------------------------------------------------+
```
