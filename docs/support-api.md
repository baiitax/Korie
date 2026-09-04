# Support API Architecture & Route Specifications

## RESTful & Real-Time Endpoints
- `GET /api/support/tickets` — Paginated list of tickets with filters for status, priority, category, and jurisdiction.
- `POST /api/support/tickets` — Create a new support ticket with automatic classification and SLA timestamp computation.
- `GET /api/support/tickets/:id` — Full ticket model with messages, customer context, and transaction trace.
- `POST /api/support/tickets/:id/messages` — Append customer reply or staff-only internal note.
- `POST /api/support/tickets/:id/assign` — Assign or reassign ticket to an officer or queue.
- `POST /api/support/tickets/:id/escalate` — Structured hierarchical escalation to Tier-2 or Tier-3 specialist queues.
- `POST /api/support/tickets/:id/resolve` — Mark case resolved with formal resolution summary.
- `GET /api/support/customers/:id` — Retrieve masked Customer 360° context.
- `GET /api/support/transactions/:id` — Fetch live ledger trace, NIBSS session ID, and provider switch status.
- `GET /api/support/playbooks` — Retrieve step-by-step resolution runbooks by category.
- `GET /api/support/analytics` — Real-time support KPI metrics, CSAT, and root-cause drivers.
