# IAM, PAM & Security Operations REST API Reference

## 1. Identity & Session Governance
- `GET /api/security/me`: Retrieve current actor identity, active roles, granted permissions, session assurance level (AAL), and device posture.
- `GET /api/security/sessions`: List active workforce sessions across the organization.
- `POST /api/security/sessions/[id]/revoke`: Terminate a specific session.
- `POST /api/security/sessions/revoke-all`: Terminate all active sessions for a target identity.

## 2. Privileged Access Management (PAM)
- `GET /api/security/pam/requests`: Retrieve active and pending JIT privilege requests.
- `POST /api/security/pam/requests`: Submit a Just-In-Time privilege elevation request.
- `POST /api/security/pam/requests/[id]/approve`: Approve a JIT request (Maker-Checker dual authorization).
- `POST /api/security/pam/break-glass`: Trigger emergency break-glass privileged session.

## 3. SIEM, Detection & Incident Management
- `GET /api/security/events`: Stream normalized security event logs.
- `GET /api/security/alerts`: List prioritized security detection alerts.
- `GET /api/security/incidents`: Query active security incidents with response timelines.
- `POST /api/security/incidents/[id]/contain`: Execute controlled automated containment actions.
- `GET /api/security/posture`: Compute multi-dimensional security posture score.
