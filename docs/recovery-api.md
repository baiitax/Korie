# Transaction Recovery & Financial Exception REST API Reference

## 1. Recovery & Status Query
- `GET /api/recovery/cases`: List active transaction recovery cases with SLA status.
- `GET /api/recovery/cases/[id]`: Retrieve full recovery case dossier.
- `POST /api/recovery/query-status`: Trigger upstream provider status inquiry adapter.

## 2. Refunds & Reversals
- `GET /api/refunds`: Query refund requests with remaining balance trackers.
- `POST /api/refunds`: Submit a refund request (full or partial).
- `POST /api/refunds/[id]/approve`: Maker-Checker approval for high-value refunds.
- `POST /api/reversals`: Trigger compensating financial reversal.

## 3. Disputes & Chargebacks
- `GET /api/disputes`: List active disputes across customer, agent, and merchant channels.
- `POST /api/disputes`: Open a new formal dispute claim.
- `POST /api/disputes/[id]/evidence`: Attach hash-verified evidence file.
- `POST /api/disputes/[id]/decision`: Resolve dispute with ledger compensation or dismissal.
- `GET /api/chargebacks`: Query acquiring network chargeback cases.
