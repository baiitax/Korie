# AML REST API Reference

## 1. Alerts & Cases
- `GET /api/aml/alerts`: Query prioritized alerts with severity, status, and jurisdiction filters.
- `POST /api/aml/alerts/[id]`: Assign, triage, escalate, or convert alerts to cases.
- `GET /api/aml/cases`: List active investigations with SLA clocks and risk indicators.
- `GET /api/aml/cases/[id]`: Retrieve full case dossier including notes, evidence, and graph links.
- `POST /api/aml/cases/[id]`: Add immutable notes, attach evidence, or submit decisions.

## 2. Scenarios, Graph & Screening
- `GET /api/aml/scenarios`: Retrieve active detection scenario library.
- `POST /api/aml/scenarios/simulate`: Replay scenarios against historical data.
- `GET /api/aml/network`: Explore 1-3 hop entity network graph.
- `POST /api/aml/screening`: Execute PEP, sanctions, and adverse media screening.
