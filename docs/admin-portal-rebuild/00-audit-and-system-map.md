# Admin Portal Rebuild — 00 · Repository Intelligence Audit & System Map

**Phase 0 deliverable.** Audited before any redesign, per the rebuild brief.
Sources: full read of `src/app/admin/**`, `src/components/admin/**`,
`src/services/adminDataService.ts`, `src/lib/security/*`, the live portal
service layers (`customer` / `agency` / `support`), `supabase/migrations/*`
(31 migrations), and live probing of the deployment.

---

## 1. System map — what the admin layer sits on top of

```
CUSTOMER / AGENT / MERCHANT / BDC
        ↓
PORTALS (customer ✓ real Supabase · agency ✓ real · support ✓ real · admin ✗ mock)
        ↓
API LAYER  (/api/customer/portal/* · /api/v1/agency/* · /api/support/* — real;
            /api/aml/* /api/core/v1/* /api/audit — engine-backed, format-only auth)
        ↓
AUTHORIZATION (customerAuth / agentAuth / supportOfficerAuth / opsAuth — REAL
               Supabase session + RBAC; legacy authMiddleware — format-only)
        ↓
BUSINESS SERVICES + ENGINES (TransactionService, lifecycle engines, ledger,
             reconciliation, AML, ERM, treasury — in-memory, seeded)
        ↓
SUPABASE (postgres, RLS, realtime) — LIVE, env configured on the deployment;
          31 migrations; the other portals already read/write it
        ↓
BANK / PROVIDER (Providus + "Koris" adapters — canned mock responses, no real
                 banking connectivity yet)
        ↓
SETTLEMENT / RECONCILIATION (engines + tables exist; no live bank feeds)
```

## 2. Inventory classification

### EXISTS + WORKS (connect, don't rebuild)
- **Real staff-auth stack**: `opsAuth.ts` (Supabase session → `user_profiles`
  → `organization_members` → role allow-list), mirrored by `supportOfficerAuth`,
  `agentAuth`, `customerAuth`. RBAC roles seeded: SUPER_ADMIN,
  ORGANIZATION_OWNER, ORGANIZATION_ADMIN, DEVELOPER, FINANCE_OFFICER,
  COMPLIANCE_OFFICER, SUPPORT_OFFICER, AGENCY_OPS_ADMIN, AGENCY_COMPLIANCE.
- **Live Supabase schema**: `customers`, `customer_transactions`, `agents`,
  `agency_transactions`, `customer_kyc_documents`, `agent_onboarding_applications`,
  `customer_disputes`, `reconciliation_exceptions`, `audit_events`,
  `ledger_accounts`, `outbox_events`, `provider_nodes`, `incident_records`,
  `fx_rates`, `organizations`, `organization_members` + more.
- **Engine-backed read APIs** the admin pages already call: `/api/v1/erm/*`,
  `/api/v1/alm/*`, `/api/v1/risk/*`, `/api/aml/*`, `/api/audit`, `/api/agents`,
  `/api/v1/agency/*` (real, Supabase-backed after the agency real-ification).
- **Admin UX primitives worth keeping**: `EntityDrawer`, `MakerCheckerModal`
  (maker-checker already exists as a concept), Cmd+K hook in `AdminContext`,
  country filter, environment toggle.
- **Realtime pattern**: `useAgentRealtime` (Supabase channels) — reusable.

### UI ONLY (fabricated — the mock core to eliminate)
- `src/services/adminDataService.ts` (773 lines): hardcoded `TRANSACTIONS`,
  `CUSTOMERS`, `AGENTS`, `MERCHANTS`, `BDC_OPERATORS`, `LEDGER_ENTRIES`,
  `BANKING_NODES`, `RECONCILIATION_EXCEPTIONS`, `MAKER_CHECKER_REQUESTS`.
- `getExecutiveFinancialMetrics()`: hardcoded ₦842.15M volume, 48,920
  customers, 99.2% success rate, +14.8% trend — violates the "never fabricate"
  principle on the most visible screen.
- 7 admin pages import these constants (dashboard, transactions, transfers,
  wallets, merchants, bdc, banking-nodes). `support` and `audit` pages carry
  their own inline arrays with zero API calls.
- `AdminContext`: `isRealtimeActive: true` and `notificationsCount: 4` are
  fiction (no realtime wired, no notification source).

### SECURITY RISK (fix in this phase)
- **`/admin` has no authentication or authorization guard** — every admin
  page is publicly reachable on the live deployment. The portals around it
  got real auth; the admin shell predates it.
- Admin APIs that mutate must never trust client-asserted roles; the
  `opsAuth` pattern already solves this — admin gets the same.

### EXISTS + PARTIALLY CONNECTED
- Many operational pages (risk, treasury, kyc, agents, security) already
  fetch 4–12 real endpoints each — but blend results with inline fallback
  arrays. Later phases: remove the fallbacks, keep the real reads.
- `CommandCenterOverview` (dashboard) renders mock constants exclusively.

### MISSING (later phases, documented honestly)
- No real banking/provider connectivity (adapters return canned successes) —
  node health must render **Unknown**, never "Operational", until a real
  probe exists.
- No SLA engine, no automation-rules engine, no workflow builder, no
  notification fan-out to email/SMS (only in-app tables).
- No admin role-based dashboard variants (single static dashboard today).

### NAMING
- Code uses `KorisBankAdapter` / `KORIS_NE` (technical identifiers — kept;
  changing would touch ledger/provider records). User-facing copy must say
  **Coris Bank**. The admin UI currently mixes both.

## 3. What this phase delivers (Phase 2 + 3 of the brief)

1. **Real admin auth**: `src/lib/security/adminAuth.ts` (session → profile →
   org role allow-list), `/api/admin/session` ("who am I"), `/admin/login`
   (Supabase `signInWithPassword`, mirroring the support officer flow),
   session gate on the admin shell — no session, no dashboard.
2. **Real data core**: `/api/admin/overview` — per-section aggregation from
   the live Supabase schema with per-section `ok | unavailable` states;
   honest `unknown` for banking nodes; zero fabricated numbers.
   `src/lib/admin/overviewData.ts` is the pure builder (unit-tested).
3. **Shell rebuild**: floating rail sidebar (icon-first, expandable, tooltips,
   real badge counts from the overview), command bar (search trigger,
   environment, system status, theme, profile), command palette (Cmd+K),
   floating mobile navigation + drawer. `EntityDrawer` and `MakerCheckerModal`
   are preserved.
4. **Dashboard rebuild**: command-center overview on the real payload —
   system health, KPI grid (drill-down links), queues, activity from
   `audit_events`, alerts — with loading / unauthorized / unavailable states.

## 4. Roadmap (subsequent phases)

- **P4** Transactions + Customer 360 on Supabase reads (replace
  adminDataService consumers one by one; delete the file when unused).
- **P5** Banking nodes & provider monitoring (real probes when integrations
  land; circuit_breaker_states + provider_nodes until then).
- **P6** Finance + reconciliation console (reconciliation_exceptions /
  runs / sessions tables are ready).
- **P7** KYC + compliance + risk (customer_kyc_documents, AML stack, ERM).
- **P8** Agency + merchant consoles (agency tables are live).
- **P9** Support + incidents (support tables live; incident_records exists).
- **P10** Automation engine (rules + runs + audit — new tables, maker-checked).
- **P11** Security center + RBAC management + immutable audit views.
- **P12–14** Mobile/tablet polish, performance, E2E.

## 5. Verification contract for every phase

`tsc --noEmit` · `npm test` · `npm run lint` · `npm run i18n:check` ·
`next build` · Playwright probes (unauthorized state, sign-in, rail, mobile
widths) — the same gates CI now enforces on every push.
