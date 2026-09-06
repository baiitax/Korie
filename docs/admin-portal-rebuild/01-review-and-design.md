# Admin Console — Review, Workflow Automation & System Configuration Hub

Status: DRAFT for product-owner review · Applies to the Super Admin Command Center (`/admin`)

---

## 1. Why this exists

Product request (two parts):

1. **Review the admin portal and simplify actions** — find repeated multi-step manual
   operations and add an option to automate those workflows.
2. **Add a configuration page** where the operator can register other fintech APIs and the
   system **detects and uses them**: payment gateways, settlement rails, WhatsApp support
   agents, bank node connections, bank liquidity pools, and the remaining system
   configuration surface.

This document is the audit + design for both. No code has been written from it yet.

---

## 2. What the admin console is today (audit findings)

- 36 dark-themed "Command Center" screens under `/admin` (customers, agents, merchants,
  settlements, treasury, banking nodes, KYC, reconciliation, security, intelligence,
  support, …), one shared rail (`AdminConsoleFrame` + `adminNav.tsx`) and a global
  **Maker–Checker modal** for dual-control authorisations.
- **All 36 screens are front-end simulations.** There are **zero** `/api/admin/*` routes in
  the repo; data comes from static seeds (`src/services/adminDataService.ts` ~770 lines)
  or page-local arrays; every action (`handleX`) runs on `useState` + `setTimeout` and is
  discarded on refresh.
- `Platform Settings` (`/admin/settings`, 88 lines) is the only configuration screen: two
  hard-coded market cards (NGN limits / XOF limits) + **disabled** inputs showing
  "Default Banking Gateway = Providus Bank" / "Coris Bank" — the exact thing the operator
  now wants to be able to change.
- Banking Nodes (`/admin/banking-nodes`) renders a static list (`BANKING_NODES`) with a
  cosmetic "ping" that spins for 800 ms; no add/configure/credential management exists.
- Meanwhile the domain layer already contains serious, unused-for-admin engines:
  `ProviderConnectivityEngine` (provider registry + circuit breakers),
  `ProviderAdapterEngine`/`PaymentRoutingEngine` (normalised provider execution),
  `SettlementEngine`, `TreasuryEngine`/`FundingManagementEngine`, and shared types
  (`ProviderNodeAdapter` with `providerType: COMMERCIAL_BANK | SWITCH | CIT_COURIER | FX_DESK`).
  The only HTTP consumer today is `POST /api/payments/switch`.
- Administration is English-only (no i18n parity gate applies), dark console theme,
  desktop-first density; maker–checker approvals carry no persistence or audit trail.

---

## 3. Review — repeated manual actions that automation can remove

Inventory from page handlers (each is a manual multi-click flow today):

| Console module | Repeated action today | What an automation option should do |
|---|---|---|
| Global (many pages) | Maker–Checker approve/reject for every privileged action | Rule-driven **auto-approval under limits** (amount cap × country × risk tier × category), with the rule id audited; otherwise the modal still appears |
| KYC / KYB | `handleApproveKyc` per application | Auto-approve/auto-flag when the configured verification source (e.g. NIMC/NIBSS/BVN) returns match + document check passes within risk policy |
| Settlements | Create batch → approve → execute payout, per run | Auto-create + auto-approve + auto-execute on schedule (daily T+0/T+1) when variance rules pass; "dry-run first" mode |
| Support tickets | Manual triage/assign per ticket; SLA chasing | Auto-assign by queue/agent load; auto-acknowledge; route to a connected **WhatsApp support agent**; escalate on SLA breach |
| Cash operations | Till handover, vault access, movement approvals | Auto-approve movements ≤ limit & within till rules; flag the rest to maker–checker |
| Treasury | Drawdown create → approve deal | Auto-approve drawdowns ≤ facility utilisation caps; auto-raise liquidity alert otherwise |
| Reconciliation | Maker submit → checker approve per exception | Auto-resolve deterministic matches (zero variance); route genuine breaks to humans |
| Security | JIT access approvals, session revokes, break-glass | Auto-approve JIT within policy window + auto-revoke idle sessions; break-glass stays dual-control by default (configurable) |
| System health | DLQ replay, safe-mode toggle, breaker toggles | Auto-replay idempotent DLQ jobs ≤ N attempts; auto-trip/open breakers already policy-driven — allow "auto" governance toggle |
| Banking nodes | Manual ping + visual check | Continuous heartbeat + **failover rule** (auto-switch to healthy node) + alerting |
| Intelligence | Approve AI decision, run copilot | Executable decision classes with allowed auto-execute scope + kill-switch override |
| Reports / compliance | Generate snapshot → approve → submit | Scheduled generate/approve/submit within regulator window |
| Adashi | Rotation generation, disbursement, lock membership | Schedule-driven rotation/disbursement events with maker–checker only above thresholds |

**Simplification (non-automation) quick wins, same review:**

- Batch actions: multi-select approve/revoke on list screens instead of one-by-one.
- "Run like last time" memory on repeatable ops (batch, payout, close) — one click.
- Every automatable action gets a small ⚡ affordance: *Automate this* → creates a rule
  pre-scoped to that action instead of a blank rule form.
- A single **Automation Center** list (what runs, when it last ran, dry-run vs live,
  pause) instead of per-page ad-hoc timers.

---

## 4. Configuration Hub — the ask, concretely

One new first-class area in the console, **System Configuration & Connections**, with a
catalogued connector registry. Category catalogue (extensible; each row = typed form):

| Category | What is registered | Example fields beyond the common set |
|---|---|---|
| **Payment gateway** | Charging/disbursing fintech APIs | charge/refund/payout endpoints, webhook events, settlement currency |
| **Settlement rail** | Clearing/settlement APIs | clearing code, settlement cycle T+n, statement/transfer endpoints |
| **Bank node connection** | Commercial-bank core APIs | institution + country + currency, account/nuban mapping, NIP/CFA support |
| **Bank liquidity pool** | Funding/nostro sources & pool config | pool id, cap & target balance, top-up trigger %, alert thresholds |
| **WhatsApp support agent** | WhatsApp Business API desks | phone number id, verify token, agent queue, auto-reply templates, office hours |
| **KYC / verification source** | Identity sources (NIMC, NIBSS BVN, NIN, bank KYC) | verification products, sync/callback mode |
| **FX rate source** | Rate feed APIs for the FX engine | pair list, refresh cadence, margin policy |
| **CIT / cash courier** | Vault telemetry APIs | trip endpoints, vehicle id mapping |
| **Notification provider** | Email/SMS delivery APIs | sender id, template set |
| **AI decision service** | Model endpoints used by intelligence | model id, allowed decision classes, temperature/governance caps |
| **Custom REST API** | Any future category — user-defined capabilities | user-picked endpoint catalogue + auth |

Common fields on every connector: name/code, vendor, country, currency, environment
(SANDBOX/PRODUCTION), base URL + health path, auth type (Bearer / API key / Basic /
OAuth2), **masked credentials only**, declared capabilities, routing role
(PRIMARY / FAILOVER / OBSERVE), status, probe history.

### 4.1 "The system will detect it and use it" — honest semantics

When a connector is saved the system runs **detection**:

1. **Connectivity probe** — real HTTPS `GET` against the health path (when a URL is
   provided) measuring reachability, HTTP status, latency, TLS. In the demo runtime a
   probe to an unreachable/absent URL is recorded as `FAILED/UNVERIFIED` — never faked.
2. **Capability detection** — declared endpoint catalogue is validated (HEAD/OPTIONS
   where permitted); unknown vendor presets ship as "manual capability mapping" so no
   endpoint is invented.
3. **Activation** — a CONNECTED connector can be set PRIMARY for its category (or
   FAILOVER). Engines that already route (payment switch, connectivity fabric, settlement,
   treasury funding) consult the registry and prefer the configured primary when healthy;
   if none is CONNECTED the built-in demo provider is used and clearly labelled
   **DEMO MODE** in the UI.
4. **Heartbeat** — scheduled re-probes update status (CONNECTED → DEGRADED → FAILED) and
   feed the console's health surfaces (banking nodes, system health) instead of the
   static list.

Secrets policy (consistent with repo precedent): raw secrets are used only in-memory for
the probe/live call, **never persisted**; the registry stores masked values; an operator
may override a secret at runtime via an environment variable
(`KORIE_CONNECTOR_<CODE>_SECRET`) without touching the store.

### 4.2 System parameters under the same roof

The existing `/admin/settings` limits page becomes one section of the hub (server-owned),
joined by: fee engine parameters, regulatory reporting thresholds, switch routing rules,
feature flags, and the connector registry above — each as typed sections on one
configuration experience, cross-linked from the pages that consume them.

---

## 5. Proposed architecture (mirrors the developer-portal precedent)

- `src/lib/admin/AdminConfigurationEngine.ts` — server-owned, **file-backed**
  (`/tmp/korie-admin-config.json`, DEMO runtime, never in repo; env override for path);
  hydrate/persist at every public entry; `api/v1`-style typed methods: list/add/update/
  delete connectors, probe, activate/deactivate, automation rule CRUD + `decide()` +
  audit trail. Never stores raw secrets.
- BFF routes under `src/app/api/admin/config/*` (+ `automation/*`) wrapped in the
  `ApiGatewayEngine` envelope (`{ success, data } | { success:false, error }`) — the
  first server-backed surface in the admin console.
- `AdminContext` gains a server slice (config status + rule list) hydrated once, same
  pattern as `DeveloperProvider` in the developer portal.
- UI: one **Configuration & Automation** nav group with (a) Connections registry,
  (b) Automation Center, (c) System Parameters — dark console theme, 320→2560, loading/
  empty/error states, WCAG-conscious labels.
- Automation decision flow: before an action opens the Maker–Checker modal, the page asks
  `POST /api/admin/automation/decide { actionKey, amount, country, category, risk… }`;
  response is `AUTO_EXECUTE` (rule ref + audit written) or `REQUIRE_REVIEW` (modal opens,
  pre-annotated with the reason). High-value flows default to review; rules are opt-in,
  bounded by caps, and every decision lands in the immutable audit view.

---

## 6. Phased plan with acceptance gates

| Phase | Deliverables | Gate |
|---|---|---|
| **A1** | Audit sign-off (this doc) + engine/BFF foundation: connectors + probes + automation rule engine + audit, typed catalogue | tsc 0; API smoke: add/probe/activate connector; decide() auto vs review; no raw secrets in store |
| **A2** | Configuration & Connections UI (categories incl. gateways, settlements, bank nodes, liquidity pools, WhatsApp agents, custom) + System Parameters merge | add→probe→activate round trip in UI; statuses honest; loading/empty/error; responsive |
| **A3** | Automation Center + wiring: maker–checker auto-approval rules, settlements auto-run, KYC rules, support/WhatsApp assignment; batch actions on lists; audit view | qualifying action executes without modal & is audited; non-qualifying still requires review; pause switch honoured |
| **A4** | Engine preference wiring: payment switch / connectivity / settlement engines consult registry (PRIMARY/FAILOVER), banking-nodes + system-health read registry heartbeats; reconciliation of duplicated engine folders (`src/lib/gateway` vs `src/lib/integration`) | routed request honours registered provider when CONNECTED; DEMO label when falling back |

Spec/manual alignment: XOF-first with NGN second, compliance manual obligations stay
encoded as *defaults* (maker–checker on by default, caps conservative); anything that
cannot be true in a demo runtime is stated on-screen (DEMO) rather than faked.

---

## 7. Progress log (implemented)

Decisions recorded (product owner): build the hub + automation together (full), detection =
live probe + OpenAPI capability discovery, all automation categories staged, placement =
expand `/admin/settings` into the hub (settings_expand).

- **A1 — Engine + BFF (done)**: `src/lib/admin/AdminConfigurationEngine.ts` — server-owned,
  file-backed (`/tmp/korie-admin-config.json`, DEMO, env override `ADMIN_CONFIG_STORE_PATH`),
  hydrate-at-entry invariant, secrets masked-never-raw (+ runtime env override
  `KORIE_CONNECTOR_<CODE>_SECRET`), envelope via `ApiGatewayEngine`. Connector registry
  (11 categories incl. payment gateways, settlement rails, bank nodes, bank liquidity pools,
  WhatsApp agents, KYC sources, FX, CIT, notifications, AI decision, custom REST), live probe
  (real HTTPS, honest CONNECTED/DEGRADED/FAILED + latency), OpenAPI/Swagger capability
  discovery (honest “no doc reachable” + manual mapping), single-PRIMARY/FAILOVER per
  category, duplicate-code guard, CONNECTED-required-for-PRIMARY. Automation rule engine:
  action catalogue (14 workflows), caps/countries/risk scopes, live vs dry-run, `decide()`
  with per-decision audit + `completeDecision()`. System parameters: server-owned limits,
  locked gateway fields driven by the registry. 15 BFF routes under `/api/admin/config/*`,
  all `force-dynamic` (Next 14 GET-cache lesson from the developer portal).
- **A2 — Configuration & Automation hub UI (done)**: `/admin/settings` rebuilt as the hub
  (nav item renamed “Configuration & Automation”): tabs Overview (stats, active-provider
  routing map with DEMO fallback labels, recent activity), Connections (category filters,
  register modal w/ dynamic category fields + secret reveal-once pattern, probe / discover /
  role / pause / remove, capability catalogue with AUTO/MANUAL tags + manual mapping),
  Automation (automatable-workflow catalogue with per-action “Automate” pre-scoped rule
  creation, rules list w/ enable + dry-run toggles, edit/delete, per-rule decision test),
  Parameters (NG/NE/fee/regulatory groups, locked gateway hints), Audit trail (kind filters).
  Dark console theme, loading/empty/error states throughout.
- **A3 — Automation wiring (done, global + flagship)**: `MakerCheckerModal` now consults the
  decision service on open (`maker_checker.approve`, ctx from the request). A matching LIVE
  rule auto-approves (audited decision id, result screen names the rule; no dual-control);
  dry-run or no match → manual dual-control with an explicit “no matching automation rule”
  strip. This one hook automates every action routed through maker–checker (wallet freezes,
  node failovers, reconciliation entries, …) across the console. Hub rules also work for the
  other catalogue actions via the decision service; pages that are already one-click server
  calls (KYC verify, settlement payouts via `/api/core/v1`) intentionally keep their direct
  paths — their automation surface is the rule engine (audited decisions available to any
  future scheduled runner).
- **A4 — Engine preference wiring (partial — next session)**: routing map + DEMO fallback
  labels implemented and visible on the hub Overview; the payment-switch/connectivity/settlement
  engines are NOT yet re-pointed at the registry (they run on their own static provider maps);
  duplicated engine folders (`src/lib/gateway` vs `src/lib/integration`) still await
  reconciliation. Remaining: consumer-engine wiring + heartbeat-driven banking-nodes/system-health.
- **Verified (fresh store)**: overview/categories/actions; add connector (raw secret never
  leaked, masked only); probe unreachable → FAILED `NETWORK_UNREACHABLE` (honest);
  probe self-hosted API → CONNECTED HTTP 200 11ms; PRIMARY-on-FAILED → CONFLICT;
  discovery no-doc → 0 auto caps + manual mapping works; decide no-rule → REQUIRE_REVIEW;
  live rule within cap → AUTO_EXECUTE w/ decisionId; over cap / wrong country → REQUIRE_REVIEW;
  dry-run → REQUIRE_REVIEW + audit; parameters PATCH ok, locked gateway → FORBIDDEN;
  duplicate code → DUPLICATE_REQUEST; audit trail ordered; settings + affected pages SSR 200.
  Build: tsc 0 · 404/404 static.

---

## 8. Open decisions for the product owner

- **D-C1** Scope of this pass: design sign-off first (this doc → next session builds A1),
  or build A1 (+A2) immediately?
- **D-C2** Detection depth: live HTTPS probes when a URL is given (recommended, honest
  FAILED states) vs purely internal statuses vs attempt OpenAPI-based capability discovery.
- **D-C3** First automation batch: starter set (maker–checker caps, settlements run,
  KYC rules, support/WhatsApp) vs ops-heavy set (reconciliation auto-resolve, treasury
  drawdowns, security sessions) vs the full inventory.
- **D-C4** Console placement: extend the governance nav group with a "Configuration &
  Automation" group vs fold everything under today's Platform Settings item.
