# KoriePay Reconciliation & Settlement Engine — API Interface Map

## 1. REST Endpoints Overview
All financial APIs adhere to Tier-1 API gateway standards:
- Require `Idempotency-Key` and `X-Correlation-ID`
- Return standardized envelope `{ success, status, data, meta: { request_id, timestamp, duration_ms } }`
- Mask sensitive PII in responses and logs.

### A. Reconciliation Management
- `GET /api/core/v1/reconciliation/runs`: List reconciliation runs with filter by status, country, provider.
- `POST /api/core/v1/reconciliation/runs`: Trigger deterministic reconciliation run.
- `GET /api/core/v1/reconciliation/runs/[id]`: Inspect detailed run metrics, match ratios, and source files.
- `GET /api/core/v1/reconciliation/exceptions`: Query exception work queue by severity, SLA, and status.
- `GET /api/core/v1/reconciliation/exceptions/[id]`: Inspect exception details, 360 transaction trace, and evidence.
- `POST /api/core/v1/reconciliation/exceptions/[id]/assign`: Assign exception to operational desk or officer.
- `POST /api/core/v1/reconciliation/exceptions/[id]/resolve`: Resolve exception with audit justification.
- `POST /api/core/v1/reconciliation/exceptions/[id]/escalate`: Escalate exception to compliance or finance director.

### B. Settlement Operations
- `GET /api/core/v1/settlements`: List settlement batches with filtering.
- `POST /api/core/v1/settlements/calculate`: Calculate net eligible settlement for merchant/agent.
- `POST /api/core/v1/settlements/[id]/submit`: Submit settlement batch for checker review.
- `POST /api/core/v1/settlements/[id]/approve`: Maker-checker approval and journal generation.
- `POST /api/core/v1/settlements/[id]/execute`: Dispatch commercial bank payment instruction.

### C. Bank Statement & Suspense Ingestion
- `GET /api/core/v1/bank-statements`: List ingested bank statements.
- `POST /api/core/v1/bank-statements/import`: Ingest and validate statement file (MT940/CSV/JSON).
- `GET /api/core/v1/suspense`: View suspense account totals and 6-stage aging schedule.
- `POST /api/core/v1/suspense/[id]/resolve`: Maker-checker suspense resolution with compensating journal.
