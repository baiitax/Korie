# KoriePay Core Financial Engine Architecture Specification

## 1. Executive Summary
The KoriePay Core Financial Engine is a high-throughput, fault-tolerant, double-entry financial fabric built to orchestrate real-time digital payments, agency cash-in/out, merchant checkouts, and bilateral cross-border remittances across Nigeria (NGN) and Niger Republic (XOF).

## 2. Core Architectural Principles
1. **Double-Entry Invariant**: Every economic shift is recorded as equal debits and credits ($\sum \text{Debits} = \sum \text{Credits}$).
2. **Immutable Audit Trails**: Journal entries and lines cannot be updated or deleted. Errors are corrected via compensating reversal journals.
3. **Derived Projected Balances**: Account balances are non-authoritative read models computed deterministically by replaying posted journal lines.
4. **Dual Control (Maker-Checker)**: All manual adjustments, large reversals, and suspense resolutions require two authorized roles.
5. **Decoupled Outbox Dispatch**: External bank rail calls (Providus NIP, Coris Sahel desk) are dispatched via transactional outbox patterns.

## 3. Supported Rails and Currencies
| Jurisdiction | Currency | Primary Clearing Node | Settlement Mechanism |
|---|---|---|---|
| **Nigeria 🇳🇬** | NGN | Providus Bank Nigeria | NIP Direct Settlement Pool (1010) |
| **Niger Republic 🇳🇪** | XOF | Coris Bank Niger Republic | WAEMU Interbank Clearing Pool (1020) |
| **Cross-Border FX** | NGN / XOF | BDC Multi-Currency Clearing Desk | Zero-Sum FX Bridge Account (6010) |

## 4. Engine Architecture Diagram
```
Client API Request
       │
       ▼
[ Idempotency Lock Layer ]
       │
       ▼
[ Accounting Rule Engine ] ──► [ Versioned Rule Definition ]
       │
       ▼
[ Double-Entry Ledger Engine ]
  ├─ Validates Debits == Credits
  ├─ Enforces Integer Minor Units
  └─ Writes Immutable Journal Entry & Lines
       │
       ▼
[ Derived Balance Projection ] (Read Cache Rebuilt in Memory/DB)
       │
       ▼
[ Outbox Event Dispatcher ] ──► [ External Bank Rails (Providus / Coris) ]
```
