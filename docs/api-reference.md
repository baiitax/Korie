# API Reference: Customer, Account & Banking Product Factory

## 1. Banking Product Endpoints
- `GET /api/products`: List all active and draft products across Nigeria & Niger.
- `POST /api/products`: Create a new draft product with eligibility, limits, fees, and ledger mappings.
- `GET /api/products/[id]`: Fetch complete product specification.
- `POST /api/products/[id]/versions`: Create a new version of an existing product.
- `POST /api/products/[id]/simulate`: Execute a sandbox simulation of fees and ledger entries without posting.
- `POST /api/products/[id]/activate`: Transition product to `ACTIVE` (requires maker-checker sign-off).
- `POST /api/products/check-eligibility`: Dynamic evaluation of customer eligibility for product enrollment.

## 2. Customer & Account Endpoints
- `GET /api/accounts`: List accounts with currency and product bindings.
- `POST /api/accounts/open`: Open a new banking account linked to a verified product.
- `GET /api/accounts/[id]`: Account details, balance via Subledger, and restrictions.
- `POST /api/accounts/[id]/restrict`: Apply fine-grained operational restrictions (`DEBIT_ONLY`, `CREDIT_ONLY`, etc.).
- `POST /api/accounts/[id]/freeze`: Full account freeze.
- `GET /api/customer/360?id=...`: Complete 360-degree customer profile with audit timeline.
- `POST /api/customer/recovery`: Multi-step account recovery request.
- `GET /api/beneficiaries` & `POST /api/beneficiaries`: Manage verified counterparties with cooldown tracking.
