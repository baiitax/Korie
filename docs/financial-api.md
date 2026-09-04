# Core Financial API Specification

## Base URL
`/api/core/v1`

## 1. Ledger Endpoints
- `POST /api/core/v1/ledger/post`: Post a balanced double-entry journal entry.
- `GET /api/core/v1/ledger/accounts`: List chart of accounts with derived balances.
- `GET /api/core/v1/ledger/accounts/[id]`: Account 360 view with line history.
- `POST /api/core/v1/ledger/rebuild`: Replay journal lines and rebuild balance caches.

## 2. Financial Reporting Endpoints
- `GET /api/core/v1/reports/trial-balance`: Generate authoritative Trial Balance.
- `GET /api/core/v1/reports/balance-sheet`: Generate Balance Sheet ($Assets = Liabilities + Equity$).
- `GET /api/core/v1/reports/profit-loss`: Generate Income Statement ($Net = Revenue - Expenses$).

## 3. Settlements & Reconciliation Endpoints
- `GET /api/core/v1/settlements`: List settlement batches.
- `POST /api/core/v1/settlements`: Create or dispatch settlement payouts.
- `GET /api/core/v1/reconciliation`: Retrieve 4-way reconciliation sessions and suspense aging.
- `POST /api/core/v1/reconciliation`: Run 4-way matching session or resolve discrepancy.

## 4. Governance & Maker-Checker Endpoints
- `GET /api/core/v1/adjustments`: List pending and reviewed adjustments.
- `POST /api/core/v1/adjustments`: Submit (Maker) or Approve/Reject (Checker) financial adjustments.
- `POST /api/core/v1/daily-close`: Execute automated daily financial close.
