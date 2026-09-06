# KoriePay — Deep System Review: UI · API · Database · Demo-Portal Gaps

Date: 2026-09-06 · Repo: `baiitax/Korie` @ branch `feature/compliance-portal-demo-rebuild`
Method: static inventory (counts/greps over `src/`, `supabase/`, `scripts/`, `tests/`) + live probes
against the running build (port 3000). All findings are evidence-based; simulated areas are
labelled honestly, nothing is presumed live.

---

## 1. Estate at a glance (measured)

| Layer | Count | Notes |
|---|---|---|
| UI pages (`src/app/**/page.tsx`) | 227 | across 8 portals + ~20 marketing/auth pages |
| Portals | 8 | customer(17) agent(15) aggregator(35) merchant(16) admin(35) compliance(41) developers(21) support(19) |
| API route files (`src/app/api/**/route.ts`) | 261 | every file exports ≥1 HTTP handler |
| API top groups | 28 | v1(115) core(44) admin(15) security(12) customer(11) developers(9) auth(8) … |
| Engine/service classes (`src/lib`) | 145 | 99 in-memory `Map` state · 2 file-backed · 0 run SQL at request time |
| Duplicated engine files | 5 | see §3.4 |
| DB migrations (`supabase/migrations`) | 27 | 270 `CREATE TABLE`, 17 `INSERT`, 28 RLS-enabled, 15 functions/triggers |
| Schemas | 3 | `public`, `adashi.*`, `liquidity.*` (+ warehouse tables in `public`) |
| i18n dictionaries | 28 files | EN/FR/HA parity enforced as **prebuild gate** (`scripts/i18n-parity.mjs`) |
| Tests | 1 file | `tests/auth_suite.test.ts` |
| Route files marked `force-dynamic` | 29 / 261 | only developer + admin-config BFFs |
| API routes with any auth check | 7 / 261 | no `middleware.ts` exists |
| "Realtime" surfaces | 4 files | timer-driven decorators, not streams |

---

## 2. UI estate — where every portal actually gets its data

Tier definitions:
- **S (server-backed)**: page reads/writes HTTP routes that return engine data.
- **P (provider/client-state)**: page runs on a React context seeded by a demo data service; actions mutate client state only (lost on refresh).
- **B (bespoke/static)**: hard-coded arrays or single-purpose tables with no data layer.

### 2.1 Per-portal posture (page groups, not files)

| Portal | Pages | Wired to API | Posture & evidence |
|---|---|---|---|
| **admin** | 35 | 19 page-groups fetch `/api/v1`, `/api/core/v1`, `/api/security`, `/api/finance`, `/api/payments/switch`… | **S/P mix**: adashi, agents, apis, cash-operations, customers, disputes, intelligence(partial), kyc, ledger, payments, products, reconciliation, reports, risk, security, settlements, system-health, treasury, compliance(regulatory) are server-backed; **banking-nodes, bdc, merchants, transactions, transfers, wallets** still seed-driven (`adminDataService`); bill-payments, businesses, team, audit, webhooks, support, fx, aggregators are bespoke/static; `/admin/settings` = S (config hub, this branch); overview uses client seed + some `/api` |
| **compliance** | 41 | 0 pages fetch APIs | **P (pure provider)** — `CompliancePortalContext` over `compliancePortalData.ts` (54 KB seed); actions mutate client state; scoped light-first token work present in only 2 files; locale dict 852 LOC but usage is partial (parity green ≠ used) |
| **customer** | 17 | receipts + account-360 + a few flows | **P with partial S**: full EN/FR/HA, light-first; wallet balance read from a ledger engine (verified CFA 450,000 in earlier work); most action screens remain provider-mock (`customerDataService`) |
| **developers** | 21 | 3 page-groups + context hydrate | **P except W2/W3**: dashboard, applications, credentials = S via `/api/developers/*` (file-backed engine); remaining 18 (explorer, webhooks, logs, status, docs…) = P on `DeveloperContext` mock; explorer not yet server-executed (planned W4) |
| **agent** | 15 | 1 group | **P**: `AgentContext` + `agentDataService`; light portal, agency locale exists; no `/api/v1/agency/*` consumers in pages despite 7 such routes existing |
| **aggregator** | 35 | 0 | **P**: `AggregatorContext` + `aggregatorDataService` (26 KB); no API consumption despite 0 `/api/aggregator*` routes existing |
| **merchant** | 16 | 0 | **P**: `MerchantContext` + `merchantDataService`; some demo/aspirational labels present |
| **support** | 19 | 0 | **P**: `SupportContext` + `supportDataService` (35 KB); 0 simulated-action timers — mostly static catalogue/help surfaces |

Marketing/auth pages (~30): static content + auth flow pages (login/register/MFA/OTP) using `AuthContext`; `/api/auth/*` exists (8 route files).

### 2.2 Cross-portal UI observations
- Console shells: admin + compliance dark; customer/agent/merchant/aggregator/developers light-first; marketing light. Admin console has no i18n usage (English-only) — acceptable if documented; compliance/agent/merchant/aggregator dictionaries exist but **coverage is inconsistent with actual page strings** (parity checks dictionaries against each other, not against pages).
- Loading/empty/error states: present on the newly built developer pages, admin settings hub, and parts of compliance; older bespoke pages mix ad-hoc `Loading…` text and no empty states.
- “Realtime/auto-refresh/live” indicators exist on several dashboards but are `setInterval`-driven decorations with **no backend push** (no SSE/WebSocket anywhere).
- 227 pages, zero automated UI/visual tests; one auth test file only.

---

## 3. API review

### 3.1 Surface
- 261 route handlers across 28 groups; `/api/v1` (115) is the broadest simulation catalog (adashi, agency, cash, ERM, funding, integration, intelligence, regulatory, treasury, AML, gateway…); `/api/core/v1` (44) carries financial/identity/reconciliation core; newest additions (`/api/admin/config/*`, `/api/developers/*`) are the only two **engine-owned, persistence-correct** families.
- Live probes (running build): `/api/v1/management/kpis`, `/funding/facilities`, `/adashi/stats`, `/cash/liquidity/summary` all return rich deterministic seeds shaped `{success:true,data…}` or `{success:true,timestamp,data…}` — no request mutates durable state.

### 3.2 Envelope inconsistency (measured)
At least **8 distinct response shapes** coexist:
1. `gateway.createResponse/createError` (≈78 usages) — the standard `{success,data,meta}` / `{success:false,error:{code,message,…}}`.
2. `{success:true,data:{…}}` hand-rolled (≈60+) — same contract, no `meta`.
3. `{success:true, <entity>: result}` — payload on top-level keys: `account`, `agent`, `payment`, `dispute`, `complaint`, `product`, `terminal`, `device`, `incident`, `alert`, `case`, `report`, `refund`, `journal`, `session`… (≈35 variants).
4. `{success:false, error: message}` string errors (≈200 usages incl. inline) with varying status codes.
5. Error codes inline (`'NOT_FOUND'`, `'PRODUCT_NOT_FOUND'`, `'CASE_NOT_FOUND'`…) vs `error.message` only — client code must guess.
6. `{status:'success'}`-style responses in some core flows (`/api/core/v1/identity/verify` returns `data.status === 'success'`).
7. Bare success flags with payload at other keys (`{success:true, count, data}` in v1/adashi family).
8. `{error:"..."}` without `success` in a handful of form/newsletter endpoints.

**Impact**: any generic client helper (like the developer portal’s) cannot be reused; consumers per portal hand-roll parsing; inconsistent error codes break the idempotency/audit story.

### 3.3 Persistence & cross-route correctness (systemic, proven)
- 99 of 145 engines are in-memory singletons; Next.js route workers each hold their own module instance. We proved this failure mode live on the developer workspace (route A created, route B could not see it until file-backing landed). The same architecture applies to every `/api/v1`, `/api/core/v1`, `/api/security`… family that relies on singleton maps — **mutations are not durable across requests/workers; pages that POST then re-GET can show stale/empty lists**.
- Only `DeveloperWorkspaceEngine` and `AdminConfigurationEngine` are file-backed.
- Static GET caching: 232/261 route files lack `force-dynamic`; any GET handler that never touches `req` can be statically cached by Next 14 and serve a first-request snapshot (the exact bug fixed on `/api/developers/workspace` — see developer audit §5). Systemic risk across the estate.
- 2 engines import supabase; **zero engines execute SQL at runtime** (§4).

### 3.4 Duplication & taxonomy drift (measured)
| Duplicate | Paths | Risk |
|---|---|---|
| `DeveloperSandboxEngine` | `lib/gateway` · `lib/integration` | two sandbox behaviors; consumers may mix |
| `PartnerManagementEngine` | `lib/gateway` · `lib/integration` | partner registry divergence |
| `ProviderConnectivityEngine` | `lib/gateway` · `lib/integration` | circuit-breaker state duplicated |
| `SettlementEngine` | `lib/financial` · `lib/settlement` | settlement semantics split across two engines |
| `TerminalManagementEngine` | `lib/agency` · `lib/terminals` | terminal lifecycle duplicated |
| Type taxonomies | `types/gatewayEngine.ts` vs `types/integrationEngine.ts` vs `types/paymentSwitchEngine.ts` | overlapping `ProviderNodeAdapter`/route/capability concepts that should be one registry (this is also the A4 leftover from the admin hub) |

### 3.5 Security posture
- No `middleware.ts`; 7/261 routes do any auth/introspection check (mostly the customer receipts/360 ownership fixes + auth API). Every console route (`/api/admin/*`, `/api/compliance*` none exist, `/api/v1/*`, `/api/core/v1/*`) is callable unauthenticated — consistent for a demo, but **inconsistent labeling**: screens imply privileged sessions (role switchers, “officer” pickers, maker-checker) while nothing binds the API to that identity.
- Raw “verify/simulate” endpoints (`/api/core/v1/identity/verify`, `/api/v1/integration/sandbox/simulate`, `/api/v1/products/simulate`, `/api/v1/cash/liquidity/simulate`) return deterministic success — acceptable demo semantics only if UI labels say SIMULATED; several screens don’t.

### 3.6 What the API estate lacks
- **No admin/compliance API at all** before this branch’s `/api/admin/config` (audit trail, maker-checker decisions, connectors). Compliance portal has zero server routes.
- No uniform request-id/correlation-id handling outside the gateway envelope users.
- No rate limiting or idempotency enforcement at runtime (engines exist: `IdempotencyEngine`, `ApiIdempotencyRecords` tables — unused by routes).
- No health contract versioning for the simulation catalog.

---

## 4. Database review

### 4.1 What exists (measured)
- 27 migrations (2026-09-03 → 2026-09-04), 270 tables across schemas `public` (majority), `adashi`, `liquidity`; warehouse tables in `public` (data_sources, data_lineage_*, data_dictionary_entries, reporting_adjustments…).
- Integrity tooling present: `verify_double_entry_balance()`, `prohibit_ledger_mutation`, `prohibit_audit_mutation`, `prohibit_locked_member_deletion`, liquidity reservation functions, `trg_immutable_financial_records`; RLS enabled on 28 tables; 17 seed `INSERT`s only.
- Breadth is genuinely impressive: double-entry ledger, wallets/holds, payments + idempotency, providers/webhooks/outbox/DLQ, reconciliation, AML cases & graph, ERM, treasury/ALM/liquidity pools, adashi (cycles/allocations/rotations), PAM/SOC (break-glass), KYC identity, settlement batches, cash/vault/CIT, agency terminals/devices, complaints, gateway/partner/provider layer, regulatory data warehouse.

### 4.2 Structural observations (design questions, not defects)
1. **Two parallel adashi models**: `public.adashi_*` (13+ tables) vs `adashi.*` schema (30+ tables) — and the API catalog (`/api/v1/adashi/*`) serves yet another in-memory set. Three sources of truth for one domain.
2. **Ledger family overlap**: `ledger_accounts/ledger_transactions/ledger_entries` (mig. 03) vs `gl_accounts/gl_journals/gl_journal_lines` (mig. 12) vs the `financial/*` engines’ own books — the migration set does not document how these families interlock.
3. **Warehouse mirrors**: customer_records/partner_*/customer_* families (mig. 23+) denormalize operational tables; no ETL/population path for them is visible in the migrations.
4. **Seeds**: 17 INSERTs only — a fresh environment boots empty for most domains (wallets, ledger, providers), while **every UI/engine seeds its own richer canonical dataset in TypeScript**. Demo numbers (₦/CFA) therefore cannot be traced to the DB.

### 4.3 The core disconnect (headline finding)
**The database is authoritative-by-design and idle at runtime.** Schema contracts (270 tables), RLS, immutability triggers, and financial functions have no executing consumer:
- No engine performs a SQL read/write during request handling (measured: only 2 files import the supabase client; no `from(…)` data access in engines).
- Only 2 file-backed engines hold runtime state; 99 in-memory.
- UI claims (limits, tiers, wallets, batches) come from TS seeds that resemble—but are not—the SQL columns; drift risk grows with every new migration/page.
This is documented in `BANKING_INTEGRATION_PLAN.md` (“documented, not fabricated… not executed in this sandbox”), which is honest — but the review should state the *consequence*: any two of the three layers (SQL ↔ engines ↔ UI) can disagree today and nothing detects it.

---

## 5. Gap matrix (prioritized)

| # | Gap | Severity | Evidence |
|---|---|---|---|
| G1 | Runtime data not durable across routes/workers (99 in-memory engines) | **P0** | §3.3; proven on developers workspace |
| G2 | Three layers of truth (SQL / TS engines / UI seeds) with no parity check | **P0** | §4.3; `BANKING_INTEGRATION_PLAN.md` |
| G3 | Duplicated engines & taxonomies (5 pairs + type drift) | P1 | §3.4 |
| G4 | API envelope/error-code fragmentation (8 shapes) | P1 | §3.2 |
| G5 | AuthN/Z absent (no middleware, 7/261 routes) while UI implies roles | P1 | §3.5 |
| G6 | Static-cache staleness risk on 232/261 GET routes | P1 | §3.3 (proven once) |
| G7 | Compliance + aggregator + merchant + support portals: 0 server routes; pure client-state actions reset on refresh | P1 | §2.1 |
| G8 | Realtime/live indicators are timer fakes; unlabeled | P2 | §2.2 |
| G9 | i18n dicts exist per portal but page-string coverage unverified (parity ≠ usage) | P2 | §2.2; compliance audit note |
| G10 | Tests: 1 file for a 227-page/261-route/270-table estate | P2 | §1 |
| G11 | Loading/empty/error + a11y polish uneven on older bespoke pages | P2 | §2.2 |
| G12 | Adashi/ledger/liquidity schema families overlap without documented mapping | P2 | §4.2 |
| G13 | Simulate/verify endpoints unlabeled on several screens | P2 | §3.5 |
| G14 | No CI or pre-push gate beyond prebuild i18n parity (lint/tsc/build only local) | P3 | scripts/package.json |

---

## 6. Demo-portal upgrade roadmap (phases, each gated)

Proposed as the next workstreams (mirrors repo precedent: audit → engine → BFF → page; each phase = commits + gate):

- **R1 — Runtime correctness sweep (P0)**: give every engine that backs a wired page durable, file-backed state (or a documented in-memory+DEMO label where volatile is acceptable); add `force-dynamic` to all GET handlers that read engine state; regression-prove cross-route mutation visibility per domain (the W2 method).
- **R2 — One envelope + one catalog**: migrate `/api/v1|core|security…` responses onto `StandardApiResponse` (server-side single-pass script + typed client helper per portal); delete the duplicated engine pairs after proving identical contracts (keep one implementation, alias the other); collapse overlapping types into one provider-registry type used by gateway/integration/paymentSwitch.
- **R3 — Demo identity layer**: add `middleware.ts` that (a) issues a demo session via the existing `/api/auth` routes, (b) gates console portals (admin, compliance, developer, agent) behind it with honest “DEMO session — no real credentials” labeling, (c) binds actor headers (`x-korie-actor`) used by audit trails (developer/admin config already accept an actor).
- **R4 — DB↔engine parity**: build a schema-contract checker that diffs TS domain types/seeds against SQL columns for the core financial domains (ledger, wallets, transactions, settlement, adashi); seed the 8 base migrations for the demo environment; then choose one flow (e.g., transfer → ledger → settlement) to run genuinely through Postgres when `DATABASE_URL` is present, falling back to the file-backed engine with a visible DEMO badge — no fabrication at either end.
- **R5 — Portal experience finish**: server-route the compliance portal’s decisions + aggregator/merchant/support next actions (reusing R1 file-backing + R2 envelope); unify loading/empty/error and i18n-page coverage checks (extend parity script to scan pages); label timer-driven “live” surfaces; targeted a11y + 320→2560 QA on the bespoke admin pages (banking-nodes, bdc, merchants, transactions, transfers, wallets remain seed/static — highest visual ROI).

Quick wins available immediately (no design needed): label all simulate endpoints in UI; make admin console English-only posture explicit; delete stale seeds no page imports; CI workflow running `tsc` + parity + a 5-route smoke.

---

## 7. Open decisions for the owner

- **D-S1** Sequence: R1+R2 first (correctness/envelope) or R3 (identity) — recommend R1 → R3 → R2 → R4 → R5 to protect future work from stale-cache/persistence surprises.
- **D-S2** Demo DB strategy: keep TS engines as source of truth with file-backing (fast, consistent with current demo) vs invest in local Postgres + R4 parity (real, heavier) — recommend file-backed now + R4 checker to prevent drift, Postgres only behind `DATABASE_URL`.
- **D-S3** Envelope unification is a breaking internal change across ~180 response sites — approve a mechanical migration pass (recommended) or keep dual-shape with typed clients per portal.
- **D-S4** Auth scope for the demo: full middleware gate on console portals (recommended) vs per-route guards on mutating endpoints only.
- **D-S5** Which demo upgrades land first after sign-off: compliance server-route pass, aggregator/merchant action wiring, or admin bespoke-page polish (recommend compliance, largest un-served surface: 41 pages / 0 routes).
