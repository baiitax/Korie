# Phase 4 — The real data layer (every page off statics and off the in-memory engines)

Date: 2026-09-06 · Status: implemented, gates green

## What changed

Before this phase the portal had three tiers of fake data:

1. **Nine thin pages** rendered inline hardcoded arrays (webhooks "whk-091", team
   "Ibrahim Shehu", settings form that saved nothing).
2. **Six pages** imported constants from `src/services/adminDataService.ts`
   (TRANSACTIONS, MERCHANTS, BANKING_NODES, BDC_OPERATORS, CUSTOMERS, AGENTS).
3. **~19 pages** fetched `/api/agents`, `/api/payments/switch`, `/api/finance/gl`,
   `/api/v1/adashi/*`, `/api/core/v1/*` etc. — all of which are **in-memory
   engine simulations with zero Supabase reads**.

All three tiers are gone. Every admin page now reads the database of record
through one audited, whitelisted data path.

## Architecture

```
ResourceTable / useAdminResource        (client, src/components/admin + src/lib/admin)
        │  GET/PATCH with admin bearer token
        ▼
/api/admin/data/[resource]              list + facets (distinct filter values)
/api/admin/data/[resource]/[id]         detail + audited PATCH
        │  authorizeAdminRequest (ADMIN_READ_ROLES / ADMIN_ROLES)
        ▼
src/lib/admin/resourceRegistry.ts       ~70 whitelisted resources
        │  table, select, orderBy, search cols, filter whitelist, mutation whitelist
        ▼
Supabase (service role)                 the database of record
```

Rules enforced by the registry and routes:

- **Reads**: adminAuth-gated; 503 `ADMIN_BACKEND_NOT_CONFIGURED` when Supabase
  env is missing; only registry-declared columns can be filtered or searched;
  search terms sanitized of PostgREST syntax; exact `count` with pagination
  (max 200 rows/page).
- **Facets**: `?facet=<filterKey>` returns distinct values from recent records,
  so filter dropdowns show what the database actually holds — never a guessed
  enum list (the migrations' CHECK constraints proved too entangled to parse
  reliably; the DB is the authority either way).
- **Writes**: only resources with a `mutations` whitelist expose PATCH; unknown
  fields are dropped; actor fields (`reviewed_by`, `resolved_by`, `approved_by`,
  `decided_by`, `investigated_by`) are stamped server-side from the verified
  admin identity; **every PATCH writes an `audit_events` row** with before/after
  state. Money-path resources (transactions, fx_rates, audit_events) are
  read-only — the engine owns those transitions.

## What the admin can actually do now

Record drawer (EntityDrawer) renders any database row generically, with
audited status actions for: customers, agents, KYC documents (customer +
agent), agent applications, disputes/chargebacks, risk cases, AML alerts/cases,
reconciliation exceptions, suspense items, support tickets/escalations,
security incidents/alerts, PAM requests, regulatory reports, incidents,
refunds, cash variances, CIT shipments, treasury deals, adashi
exceptions/disputes, products, decisions, API clients/credentials.

The fake **maker-checker modal** (which displayed "Approved & Executed" without
a single API call) and the fabricated `notificationsCount` were deleted.

## Honest boundaries (not simulated)

- Dead-letter **replay**, GL **period close**, report **generation**, orphan
  detection **runs**, FX **quoting**, product **simulation** are engine
  computations — the portal shows their persisted *results* only, and does not
  pretend to execute them.
- Maker-checker dual control is a deeper workflow than a single-actor PATCH;
  actions here are single-actor with a full audit trail instead of a fake
  two-person confirmation.

## Tests

- `tests/adminResourceRegistry.test.ts` — registry integrity: required
  resources exist, schema-qualified tables, narrow selects for payload-heavy
  tables, read-only money paths, search sanitization.
- `tests/adminResourceClient.test.ts` — client data path with a mocked
  transport: rows/counts render from the API response only, 401→unauthenticated,
  503→backend, honest empty states, PATCH + server rejection surfacing.
- `tests/adminOverview.test.ts` — overview builder (unchanged from phase 2/3).

Vitest config: `.tsx` test files + `@vitejs/plugin-react` (Next's tsconfig uses
`jsx: preserve`, which Vite cannot transform).

## Removed

- `src/services/adminDataService.ts` (all fabricated constants)
- `src/components/admin/MakerCheckerModal.tsx` (theater)
- Every inline mock array and every engine fetch in `src/app/admin/**`
