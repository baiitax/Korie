# KORIEPAY DEVELOPER SUPPORT & INCIDENT CORRELATION RUNBOOK

## 1. Unified Support Integration
The Developer Support Desk is natively unified with the **KoriePay Support Operations Portal** (`/support`).

### Automatic Context Attachment
When a developer opens a ticket from `/developers/support`, the following telemetry is automatically attached:
- `application_id`: e.g. `app_sand_88201`
- `environment`: `SANDBOX` or `PRODUCTION`
- `endpoint`: e.g. `POST /v1/transfers/cross-border`
- `request_id`: e.g. `KP-REQ-992810a4`
- `error_code`: e.g. `RATE_LOCK_EXPIRED`
- `timestamp`: UTC ISO timestamp

---

## 2. Developer Escalation Tiers
1. **Tier 1 Support Officer**: Inspects attached trace logs, verifies parameters, and matches against verified playbooks.
2. **Tier 2 API Specialist**: Investigates banking node webhooks and Providus/Koris upstream switch status.
3. **Platform Engineering / SRE**: Debugs edge gateway infrastructure and clears banking network locks.
