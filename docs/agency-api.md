# Agency Banking & Physical Channel REST API Reference

## 1. Agent & Aggregator Governance
- `GET /api/v1/agency/agents`: Query registered agent network outposts.
- `POST /api/v1/agency/agents`: Submit new agent onboarding application.
- `PATCH /api/v1/agency/agents/[id]`: Transition lifecycle status or update limits.

## 2. Devices, Terminals & Channel Authorization
- `GET /api/v1/agency/devices`: List enrolled hardware devices with trust scores.
- `GET /api/v1/agency/terminals`: Query POS terminal fleet and assignment states.
- `POST /api/v1/agency/authorize`: Execute atomic channel authorization check.

## 3. Cash Operations & Consumer Protection
- `POST /api/v1/agency/cash-counts`: Submit end-of-day denomination cash count.
- `GET /api/v1/agency/complaints`: List open consumer complaints with SLA countdowns.
- `POST /api/v1/agency/complaints/[id]/redress`: Authorize double-entry financial redress.
