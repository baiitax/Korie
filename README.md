# KORIEPAY — Tier-1 Cross-Border Financial Technology Infrastructure

> **Powering the Financial Ecosystem Across Nigeria 🇳🇬 & Niger Republic 🇳🇪**
> *Tagline:* **"Kudinka, Hannunka"** (Hausa: *Your Money, in Your Hands*)

| | |
|---|---|
| **Runtime** | Next.js 14.2.15 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS 3.4 |
| **Data** | Supabase/Postgres migrations (schema layer) + in-process domain engines (demo runtime) |
| **i18n** | English · Français · Hausa — parity enforced as a **prebuild gate** |
| **Theme** | Light-first design system (`.dark` fully supported), dark consoles for admin/compliance |
| **Inventory (measured 2026-09-06)** | 227 pages · 261 API route files · 145 engine classes · 27 migrations · 270 tables · 338 docs |

**Repository roles:** this is the *entire* KoriePay product estate — marketing/brand site, eight
operational portals, a broad simulated REST surface, domain engines, and the full financial
database schema. It is **not** connected to a live Supabase or banking provider in this
repository state; provider/ledger integration is documented honestly
(`BANKING_INTEGRATION_PLAN.md`) rather than fabricated. Anything simulated is labelled DEMO
in the UI.

---

## 1. What KoriePay Is

A Tier-1 financial-technology infrastructure platform connecting **physical agents, BDC/FX
operators, consumers, merchants, corporate enterprises, aggregators and developers** across
the Nigeria ⇄ Niger Republic corridor.

**Three primary ecosystem pillars**

1. **Agency Banking** — last-mile access, cash-in / cash-out, smart POS terminals, float &
   till management, real-time commission settlement, device trust and consumer protection.
2. **BDC / FX Digital** — real-time rate management, multi-currency treasury accounts
   (₦ NGN & XOF CFA), automated AML/compliance logging, bilateral cross-border liquidity.
3. **Customer Wallets** — domestic transfers (NIP), cross-border remittance (WAEMU/CFA),
   merchant QR checkout, bill vending, savings/Adashi (ROSCA) circles.

**Regulatory posture:** Nigeria (CBN-aligned; Providus Bank, NIBSS/NIP rails) and Niger
Republic (BCEAO/WAEMU-aligned; Coris Bank SA). XOF-first customer-facing presentation, NGN
second; no customer-facing USD. The confidential compliance manual ships with the repo as
`KoriePay_Confidential_System_Financial_Compliance_Manual_v1.0.{pdf,docx}`.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js `14.2.15`, App Router | route handlers + RSC-ready; `poweredByHeader:false`, `swcMinify`, AVIF/WebP, `optimizePackageImports:["lucide-react"]` |
| Language | TypeScript, `strict: true` | path alias `@/*` → `src/*` |
| Styling | Tailwind 3.4 + CSS custom-property tokens | light-first `globals.css`, `darkMode:"class"` |
| Icons | `lucide-react ^1.39` | tree-shaken |
| Database | Supabase (`@supabase/ssr`, `supabase-js`) | **migrations only** in this repo state |
| Testing | Playwright (dev-dep) | suite not yet configured; see §13 |
| Node | ≥ 18.17 (Next 14 requirement); developed on Node 20 | `npm ci` after fresh clone |

### Repository layout

```
Korie/
├── src/
│   ├── app/                    # 227 pages + 261 route handlers
│   │   ├── page.tsx            # corporate homepage (ecosystem visualizer, corridor map)
│   │   ├── {about,solutions,nigeria,niger-republic,technology,security,partners,
│   │   │    resources,faq,contact,careers,privacy,terms,…}   # marketing & legal
│   │   ├── {login,register,mfa,otp,verify,forgot-password,reset-password}  # auth UX
│   │   ├── customer/  agent/  aggregator/  merchant/   # light-first portals
│   │   ├── admin/             # Super-Admin Command Center (dark console, 35 screens)
│   │   ├── compliance/        # Compliance Command Center (dark, 41 screens)
│   │   ├── developers/        # Developer portal (light, glass)
│   │   ├── support/           # multi-audience help center
│   │   └── api/               # 261 route files across 28 groups (see §5)
│   ├── components/            # portal shells, contexts, modals, shared UI
│   ├── lib/                   # 145 domain engines/services (see §6)
│   ├── services/              # demo seed data services (client mock providers)
│   ├── types/                 # domain models (admin, compliance, gateway, engine types…)
│   └── locales/               # EN/FR/HA dictionaries (root + per-portal)
├── supabase/migrations/       # 27 SQL migrations — full financial model (see §7)
├── docs/                      # 338 markdown docs — architecture, runbooks, plans (see §12)
├── scripts/i18n-parity.mjs    # EN↔FR↔HA parity gate (prebuild)
├── tests/                     # auth test suite (1 file)
└── KORIEPAY_*_AUDIT.md, *_PLAN.md, compliance manual, diagram generators (root)
```

---

## 3. Architecture at a Glance

```
┌──────────────────────────── UI ESTATE (227 pages) ────────────────────────────┐
│ marketing  customer   agent   aggregator   merchant   admin   compliance     │
│ developers   support    (+ auth flows)                                        │
│  shells: KorieFloatingRail / console frames / dock / ⌘K / EN-FR-HA switchers │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │ fetch /api/...        │ (some portals: React context over seeds)
┌───────────────▼───────────────────────────────────────────────────────────────┐
│  REST SURFACE (261 route files · 28 groups: v1·core·admin·security·auth…)     │
│  envelopes: {success,data,meta} gateway standard + legacy variants (§5.2)     │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │ engine calls
┌───────────────▼───────────────────────────────────────────────────────────────┐
│  DOMAIN ENGINES (145 classes · src/lib/<domain>/*Engine.ts)                   │
│  99 × in-memory (Map singletons, DEMO) · 2 × file-backed (developer + admin)  │
│  aml · cash · treasury · settlement · paymentSwitch · gateway · adashi ·      │
│  identity · risk · erm · regulatory · recovery · security · compliance · …    │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │ (schema authority, NOT wired at runtime — see §7)
┌───────────────▼───────────────────────────────────────────────────────────────┐
│  SUPABASE SCHEMA — 27 migrations / 270 tables / RLS / ledger triggers         │
│  schemas: public · adashi.* · liquidity.*                                     │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Honest tiering.** Three data postures coexist and are labeled per screen:
`S` = server-backed (HTTP → engine), `P` = provider/client-state (React context over demo
seeds; actions reset on refresh), `B` = bespoke/static arrays. A full system audit with
measured evidence lives at [`docs/system-review/01-system-wide-audit.md`](docs/system-review/01-system-wide-audit.md).

---

## 4. Portals & UI Estate

| Portal | Pages | Shell / posture | Highlights |
|---|---|---|---|
| **Marketing** | 28 | light, brand glass, rail + ⌘K | homepage corridor visualizer, FX simulator, agent commission calculator, docs/faq/careers |
| **Customer** | 17 | light · EN/FR/HA · `CustomerContext` | wallet hub (balance server-read from ledger engine, verified), transfers, FX, receipts (ownership-enforced PDF/PNG export), support; most actions P-tier |
| **Agent** | 15 | light · `AgentContext` | dashboard, cash-in/out, terminals/devices, float & commissions, adashi groups |
| **Aggregator** | 35 | light · `AggregatorContext` | network map, merchants/agents, commissions, settlement analytics |
| **Merchant** | 16 | light · `MerchantContext` | payment links, QR, POS, virtual accounts, dashboard |
| **Admin** | 35 | **dark console** · `AdminContext` | 19 page-groups server-backed (`/api/v1`, `/api/core/v1`, `/api/security`…): adashi, cash ops, disputes, KYC, ledger, payments, reconciliation, reports, risk, security, settlements, system-health, treasury… plus **Configuration & Automation hub** (server-owned, file-backed). banking-nodes/bdc/merchants/transactions/transfers/wallets remain seed/static |
| **Compliance** | 41 | dark console · `CompliancePortalContext` | KYC/KYB, AML cases & graph, sanctions, restrictions (maker/approve/lift), regulatory calendar/reports; actions are P-tier (client state) — 0 server routes |
| **Developers** | 21 | light glass · `DeveloperContext` | **dashboard/applications/credentials are S-tier** (file-backed engine + reveal-once keys, onboarding from server state); docs/explorer/logs/status pages P-tier |
| **Support** | 19 | light · `SupportContext` | help center across audiences, contact/SLA routing |

### Configuration & Automation hub (`/admin/settings` — server-owned)

- **Connections:** register external fintech APIs across 11 categories (payment gateways,
  settlement rails, bank nodes, bank liquidity pools, WhatsApp support agents, KYC sources,
  FX feeds, CIT couriers, notification providers, AI decision services, custom REST).
  Registration → live HTTPS **probe** (honest CONNECTED/FAILED + latency) → OpenAPI/Swagger
  **capability discovery** → set **PRIMARY/FAILOVER** role. Built-in Providus/Coris nodes are
  labelled DEMO until a real connector is probed and activated.
- **Automation:** 14-workflow rule catalogue (maker–checker auto-approvals, settlement batch
  auto-run, KYC auto-approval, support/WhatsApp triage, treasury drawdowns, DLQ replay, node
  failover…) with caps/countries/risk scopes, live vs dry-run, audited `decide()` service.
  The global **Maker–Checker modal consults the decision service**: matching live rules
  auto-approve with an audit entry; everything else stays dual-control.
- **Parameters:** server-owned limits/fees/regulatory thresholds; banking-gateway fields stay
  locked until a BANK_NODE connector is set PRIMARY.
- **Audit trail:** every decision, probe, rule and parameter change, kind-filterable.

---

## 5. REST API Surface

### 5.1 Catalog (28 groups · 261 route files)

| Group | Routes | Domain | Group | Routes | Domain |
|---|---|---|---|---|---|
| `/api/v1` | 115 | adashi · agency · cash · erm · funding · fx · gateway · integration · intelligence · management · nip-gateway · planning · regulatory · reporting · treasury … | `/api/security` | 12 | alerts, incidents, PAM/break-glass, sessions |
| `/api/core/v1` | 44 | identity/KYC · ledger · reconciliation · settlement · resilience · suspense | `/api/customer` | 11 | receipts, 360, ownership-enforced |
| `/api/admin` | 15 | **config & automation hub** (server-owned) | `/api/developers` | 9 | workspace, applications, credentials, requests, activity (server-owned) |
| `/api/auth` | 8 | login/logout/session/MFA/OTP/reset | `/api/aml` | 7 | alerts/cases/monitoring |
| `/api/health` | 6 | health, internal/outbox | `/api/products` | 4 | product factory |
| `/api/{finance,disputes,accounts,recovery}` | 3 each | GL, disputes, account lifecycle, recovery | others | 1–2 each | payments, refunds, chargebacks, terminals, devices, regulatory, complaints, agents, incidents, newsletter, audit, contact, beneficiaries |

Representative conventions across the estate:
- `GET /api/developers/workspace` → onboarding + counts + masked credential/webhook previews.
- `POST /api/developers/credentials` / `…/[id]/rotate` → raw secret **exactly once**, then masked-only.
- `POST /api/admin/config/automation/decide` → `{decision:"AUTO_EXECUTE"|"REQUIRE_REVIEW", ruleId, decisionId, reason}`.
- `GET /api/v1/adashi/stats`, `/api/v1/cash/liquidity/summary`, `/api/v1/management/kpis`, `/api/core/v1/settlements` → deterministic engine seeds (S-tier pages render them live).

### 5.2 Envelope contract

The **standard** (new work — developer + admin BFFs) is the `ApiGatewayEngine` envelope:

```jsonc
// success
{ "success": true,  "data": { /* payload */ },
  "meta": { "requestId": "KP-REQ-…", "correlationId": "…", "timestamp": "…", "apiVersion": "v1" } }
// failure
{ "success": false,
  "error": { "code": "VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | CONFLICT | DUPLICATE_REQUEST | …",
             "message": "…", "details": [], "retryable": false },
  "meta": { … } }
```

Legacy `/api/v1|core|security` families largely use `{success,data}` or
`{success,entityName:…}` plus string errors. A measured inventory of 8 shape variants and
the unification roadmap live in the system audit (G4). **HTTP semantics:** 200/201 for
success, 400/403/404/409/500 for the error codes above; auth is not enforced in the demo
(see §10).

### 5.3 API governance notes (measured)

- Only the developer & admin BFFs are `force-dynamic`; Next 14 statically caches GET route
  handlers that never read the request — any engine-backed GET must opt out (systemic G6).
- Engine-backed persistence: file-backed stores exist for **2** engines
  (`DeveloperWorkspaceEngine`, `AdminConfigurationEngine`); the other 99 singleton engines
  are per-worker in-memory → cross-route mutation visibility is not guaranteed (systemic G1).
- Two engine families duplicate each other (`lib/gateway` vs `lib/integration`;
  `SettlementEngine`, `TerminalManagementEngine`) — consolidation is planned (G3).

---

## 6. Domain Engines (`src/lib`)

145 engine/service classes by domain folder — the executable business logic of the demo:

| Folder(s) | Engines (examples) |
|---|---|
| `aml/` | AmlAlertEngine, AmlCaseManagementEngine, AmlCustomerRiskProfileEngine, AmlNetworkGraphEngine, AmlScenarioEngine, screening |
| `cash/` · `terminals/` · `agency/` · `agents/` | Till/Vault/Cit/Movement/Position/Variance, DeviceTrust, TerminalManagement, AgentManagement |
| `treasury/` · `financial/` · `settlement/` | TreasuryEngine, Funding, LiquidityForecast/Stress, Alm, SettlementEngine, DoubleEntryLedger, Reconciliation, DailyClose, FeeAndCommission |
| `paymentSwitch/` | PaymentSwitchEngine, PaymentRoutingEngine, ProviderAdapterEngine, ProviderWebhookService |
| `gateway/` · `integration/` | ApiGatewayEngine (envelope), ProviderConnectivityEngine (circuit breakers), WebhookDispatch, IdempotencyEngine, ApiSecurityThreatEngine |
| `adashi/` | cycles, contributions, allocations, rotations, defaults/recovery, maker-checker, payouts |
| `identity/` · `regulatory/` · `risk/` · `erm/` | KYC, AML regulatory adapters, risk rules, GRC, third-party risk |
| `developer/` | **DeveloperWorkspaceEngine** (file-backed: org, apps, credentials, webhooks, request logs, onboarding, production gate) |
| `admin/` | **AdminConfigurationEngine** (file-backed: connectors, probes, capability discovery, automation rules + decisions, parameters, audit) |
| `recovery/` · `complaints/` · `consumer/` | case recovery, disputes, harm incidents |

**File-backed runtime stores (DEMO):** `/tmp/korie-developer-workspace.json` and
`/tmp/korie-admin-config.json` — never committed; overridable via
`DEVELOPER_WS_STORE_PATH` / `ADMIN_CONFIG_STORE_PATH`. Secrets are never persisted raw
(only masked previews); live secret injection via `KORIE_CONNECTOR_<CODE>_SECRET` env vars.

---

## 7. Database (`supabase/migrations`)

**27 migrations (2026-09-03 → 2026-09-04) · 270 tables · schemas `public`, `adashi.*`,
`liquidity.*`.** The schema is the authoritative financial model of the product:

| Migration | Theme |
|---|---|
| 01–04 | core identity/tenancy, customers & wallets, **double-entry ledger**, transactions & idempotency |
| 05–06 | providers, webhooks/outbox, reconciliation & compliance audit |
| 07–09 | RLS, core financial engine, reconciliation & settlement engine |
| 10–15 | fraud/risk/treasury/liquidity · identity/KYC/DR · payment switch + finance GL · agents/terminals/regulatory · customer product factory · AML monitoring & case management |
| 16–22 | IAM/PAM/SOC · recovery/disputes/refunds · API gateway + partner/provider layer · agency banking & consumer protection · physical cash vault/till/CIT/liquidity · treasury/ALM/funding · ERM/GRC |
| 23–27 | regulatory reporting data warehouse · business & AI decision intelligence · integration fabric · **Adashi (ROSCA) platform** + central liquidity pool |

**Integrity tooling present:** `verify_double_entry_balance()` · immutability triggers
(`trg_immutable_financial_records`, `prohibit_ledger_mutation`, `prohibit_audit_mutation`,
`prohibit_locked_member_deletion`) · adashi allocation/lock functions · liquidity
reservation functions · RLS enabled on 28 tables.

**Important honesty note:** migrations are versioned schema only. No engine executes SQL at
request time in this repo state, so SQL ↔ engines ↔ UI seeds can drift; RLS/seeds (17
INSERTs) boot mostly-empty tables. Bridging this (local Postgres behind `DATABASE_URL`,
schema-parity checker, one genuinely DB-executed flow) is roadmap item **R4** — see the
system audit.

---

## 8. Design System & Theming

- **Light-first** tokens in `src/app/globals.css` (`:root` light default; `.dark` supported,
  persisted as `koriepay_theme`). Key tokens: `--surface(-2/-3/elevated)`, `--border`,
  `--foreground(-muted)`, `--brand-primary #0d9488` (teal-600) with hover/active steps,
  brand teal/amber/orange flow + institutional midnight `#080d1A`/`#0D162A`.
- Tailwind maps colors to the CSS vars (`bg-surface`, `text-brand-primary`, …); dark mode
  via class strategy. Scope layers exist for compliance styling.
- **Console shells:** admin + compliance are deliberate dark consoles (slate/midnight +
  emerald/amber status accents); customer/agent/merchant/aggregator/developers are light-first.
  Developer portal adds glass surfaces and a premium floating rail (`KorieFloatingRail`,
  dock on mobile).
- **Accessibility/responsive targets:** WCAG 2.2 AA intent, 320 px → 2560 px support on
  rebuilt surfaces; polish is uneven on older bespoke pages (audit G11).
- **Brand colors** (logo-derived): teal `#10B981/#0D9488` · amber `#F59E0B/#FBBF24` ·
  orange flow `#F97316/#EA580C` · midnight `#080D1A/#0D162A`.

---

## 9. Internationalization (EN · FR · HA)

- Root marketing dictionary (`src/locales/{en,fr,ha}.ts`, ~1,580 lines each) plus per-portal
  dictionaries: agency, aggregator, compliance (852 LOC en), developer, merchant, support.
- **Parity gate:** `scripts/i18n-parity.mjs` runs in `prebuild` and as `npm run i18n:check`;
  it fails the build if EN/FR/HA key sets diverge (transpiles the TS dictionaries and diffs).
- Caveat (audit G9): the gate compares dictionaries to each other, **not** dictionaries to
  page usage — coverage of actual UI strings is verified manually per page during rebuilds.

---

## 10. Demo Runtime — What Is Real vs Simulated

| Claim | Reality in this repo |
|---|---|
| Wallet/ledger balances | Computed by double-entry engines from seeded books (deterministic per session); not backed by Postgres |
| Payments/transfers/refunds | Engine-simulated with provider-node attempts, latency & response codes — labelled SIMULATED where surfaced |
| Developer sandbox keys | Server-issued `kp_test_…` pairs; raw secret **revealed once**, never stored; production issuance gated `FORBIDDEN` until approved |
| Admin connectors (gateways, banks, WhatsApp…) | Live HTTPS **probes** are real network calls; unreachable endpoints record honest `FAILED`; capability discovery reads real OpenAPI docs when reachable |
| Automation decisions | Rule engine server-owned; every auto-execution writes an audit entry with decision id; dry-run rules never bypass review |
| Realtime / live indicators | Timer-driven UI decoration — **no SSE/WebSocket push**; engines do not stream |
| Identity/sessions | Auth pages + `/api/auth` exist; **no middleware gate**; console routes are open (demo) |
| Database | Migrations only (§7) |

**Non-negotiable convention:** the demo never fabricates provider/ledger outcomes that the
code cannot produce; unverified or out-of-scope capabilities are rendered as DEMO /
unavailable states, and provider integration plans are documented (`BANKING_INTEGRATION_PLAN.md`).

---

## 11. Getting Started

```bash
node --version   # >= 18.17 (Node 20 recommended)
npm ci           # install from lockfile (sandboxes reset node_modules between sessions)
cp .env.example .env 2>/dev/null || true   # optional; app runs without env
npm run dev      # http://localhost:3000
```

### Environment variables (optional; the demo runs without them)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (schema work) |
| `DEVELOPER_WS_STORE_PATH`, `ADMIN_CONFIG_STORE_PATH` | relocate the file-backed demo stores (default `/tmp/korie-developer-workspace.json`, `/tmp/korie-admin-config.json`) |
| `KORIE_CONNECTOR_<CODE>_SECRET` | runtime secret for a registered admin connector (never persisted) |
| `PROVIDUS_CLIENT_ID/SECRET`, `KORIS_API_KEY/PARTNER_SECRET`, `KORIEPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_KP_SANDBOX_TOKEN` | live-provider integration stubs (documented, not required for demo) |

### Quality gates (what “green” means)

```bash
npm run i18n:check     # EN↔FR↔HA parity — also runs prebuild
npx tsc --noEmit       # 0 errors (strict)
rm -rf .next && npm run build   # prebuild parity + “✓ Compiled” + “✓ Generating static pages (404/404)”
npm run start          # then smoke: curl -s localhost:3000/api/developers/workspace …
```

Smoke checklist (after start): `/` 200 · `/developers/dashboard` 200 ·
`/admin/settings` 200 · `/api/developers/workspace` `success:true` · `/api/admin/config/overview`
`success:true`. **Clean-build rule:** whenever `src/lib` engine code changes, rebuild from
`rm -rf .next` — incremental builds have masked engine staleness before (see developer audit).

---

## 12. Documentation Index

**338 markdown docs under `docs/`** (data models, engines,
runbooks, regulatory, UX journeys, i18n glossaries): agency-banking, adashi/ROSCA,
gateway & API, AML, cash/CIT, treasury/ALM, settlement, payment switch, ERM, recovery,
regulatory… plus these active plans:

| Doc | Purpose |
|---|---|
| `docs/system-review/01-system-wide-audit.md` | measured UI/API/DB estate, gap matrix G1–G14, roadmap R1–R5, owner decisions D-S1–5 |
| `docs/developer-portal-rebuild/01-audit-and-plan.md` | developer portal rebuild (W1 shell → W2 engine → W3 pages → W4 explorer…) |
| `docs/admin-portal-rebuild/01-review-and-design.md` | admin configuration & automation hub (A1–A4) |
| `docs/compliance-portal-rebuild/00-audit-and-plan.md`, `10-reconciliation-with-live-console.md` | compliance center rebuild + live-console reconciliation |
| `BANKING_INTEGRATION_PLAN.md` (root) | backend/ledger connection hardening for live environments |
| `KORIEPAY_CUSTOMER_BACKEND_AUDIT.md` (root) | customer-portal backend audit |
| `KoriePay_Confidential_System_Financial_Compliance_Manual_v1.0.{pdf,docx}` | financial & compliance manual |

Generator scripts at repo root: `generate_diagrams.py`, `generate_master_docx.py`,
`generate_master_pdf.py` (regenerate the confidential manual/diagrams).

---

## 13. Testing & CI Status (honest)

- Automated tests: **1 file** (`tests/auth_suite.test.ts`). Playwright is installed but a
  suite is not yet configured; no `.github/workflows` exist.
- Gates today: prebuild i18n parity (build-breaking) · `tsc --noEmit` (strict) ·
  full production build · manual curl smoke on key BFFs · per-workstream commit/push review
  by the operator.
- Improvement backlog: CI workflow (parity + tsc + build + 5-route smoke), envelope
  migration test, portal smoke suites (audit G10, R2/R5).

---

## 14. Branching & Contribution Conventions

- `main` = live production console/marketing progression (parallel work by owner).
- `feature/compliance-portal-demo-rebuild` = portal rebuild workstream (this estate).
  Direct pushes to `main` are rejected — open the feature branch, never force-merge `main`
  without an explicit reconciliation decision
  (`docs/compliance-portal-rebuild/10-reconciliation-with-live-console.md`).
- **Audit-first method:** every workstream begins with an audit/plan markdown (owner
  sign-off on decisions D-…), then engine → BFF → pages, each stage one commit with a green
  gate. Commit style: `feat(scope): …` · `fix(scope): …` · `docs(meta): …`
  (e.g. `feat(developer)`, `feat(admin)`, `fix(developer)`).
- **Demo-state hygiene:** delete `/tmp/korie-*-workspace.json` before fresh-seed tests; raw
  secrets and store files never enter the repo; UI labels DEMO where state is not durable.

---

## 15. Known Gaps & Roadmap

Condensed from the measured system audit (full evidence in §5 of
`docs/system-review/01-system-wide-audit.md`):

| # | Gap | # | Gap |
|---|---|---|---|
| G1 | 99 in-memory engines → cross-route durability | G8 | “live/realtime” indicators are timer fakes |
| G2 | three layers of truth (SQL / engines / UI seeds) | G9 | i18n parity ≠ page-string coverage |
| G3 | duplicated engines & taxonomies | G10 | tests: 1 file for the whole estate |
| G4 | 8 response-envelope variants | G11 | uneven loading/empty/error + a11y on legacy pages |
| G5 | no middleware / auth on 254 of 261 routes | G12 | schema-family overlaps undocumented |
| G6 | static-cache staleness risk (232/261 GETs) | G13 | unlabeled simulate endpoints on some screens |
| G7 | compliance/aggregator/merchant/support: 0 server routes | G14 | no CI workflow |

**Roadmap R1–R5:** R1 runtime correctness sweep (file-back engines + `force-dynamic`) →
R2 one envelope + de-duplicate engines → R3 demo identity layer (middleware gate) →
R4 DB↔engine parity + one genuinely DB-executed flow behind `DATABASE_URL` → R5 portal
experience finish (compliance server-route pass first; then aggregator/merchant/support
wiring; then bespoke admin-page polish). Owner decisions D-S1…D-S5 are open in the audit.

---

## 16. Quick Route Reference (Marketing)

| Route | Purpose | Route | Purpose |
|---|---|---|---|
| `/` | corporate homepage + visualizers + simulators | `/nigeria`, `/niger-republic` | market infrastructure pages |
| `/about` | narrative & vision | `/technology` | architecture story |
| `/solutions` + 6 sub-routes | agency, BDC/FX, customers, business, merchant, cross-border | `/security` | security & risk governance |
| `/partners` | partnerships | `/resources`, `/faq`, `/contact`, `/careers` | content & engagement |
| `/developers` | developer portal entry | `/privacy`, `/terms` | legal |

---

*Last updated 2026-09-06 · Inventory figures measured on this date; re-run the audit
methodology in `docs/system-review/01-system-wide-audit.md` to refresh them.*
