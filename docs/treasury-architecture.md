# Treasury & Financial Management Control Plane Architecture

## 1. Executive Perimeter & Architectural Hierarchy
KoriePay's Financial Planning + Treasury + Asset-Liability Management (ALM) + Funding + Balance-Sheet Management Control Plane establishes institutional-grade governance over sovereign capital, multijurisdictional liquidity, and balance-sheet solvency across Nigeria (NGN) and Niger Republic (XOF).

```
+----------------------------------------------------------------------------------------------------+
|                                      TRANSACTION EXECUTION                                         |
|                                                │                                                   |
|                                                ▼                                                   |
|                                          PAYMENT SWITCH                                            |
|                                                │                                                   |
|                                                ▼                                                   |
|                                        DOUBLE-ENTRY LEDGER                                         |
|                                                │                                                   |
|                                                ▼                                                   |
|                                          GL / ACCOUNTING                                           |
|                                                │                                                   |
|                                                ▼                                                   |
|                                     SETTLEMENT & RECONCILIATION                                    |
|                                                │                                                   |
|                                                ▼                                                   |
|                                 PHYSICAL CASH & VAULT ENGINE                                       |
|                                                │                                                   |
|                                                ▼                                                   |
|                                  TREASURY POSITION ENGINE (TRUTH)                                  |
|                                                │                                                   |
|                      ┌─────────────────────────┼─────────────────────────┐                         |
|                      ▼                         ▼                         ▼                         |
|             [LIQUIDITY LADDERS]         [ALM MATURITY]            [FUNDING FACILITIES]             |
|             (Intraday & Term)           (Assets vs Liabs)         (Drawdowns & Repayments)         |
|                      │                         │                         │                         |
|                      └─────────────────────────┼─────────────────────────┘                         |
|                                                │                                                   |
|                                                ▼                                                   |
|                             THREE-STATEMENT FINANCIAL PLANNING MODEL                               |
|                                (Linked P&L, Balance Sheet, Cash Flow)                              |
|                                                │                                                   |
|                                                ▼                                                   |
|                           MANAGEMENT INTELLIGENCE & CAPITAL SOLVENCY                               |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Inviolable Invariant: Treasury is NOT the Ledger
- **Core Principle**: Treasury never creates, overwrites, or deletes financial ledger truth.
- **Data Flow**: Treasury consumes authoritative balances from the General Ledger (`DoubleEntryLedgerEngine`) and physical counts from `CashPositionEngine`.
- **Financial Actions**: Any funding drawdown, intercompany capital injection, or facility interest payment executes strictly via balanced double-entry journals posted through the GL posting service.
