# KoriePay Sandbox Developer Portal — Audit & Rebuild Plan

Date: 2026-09-06 · Scope: `baiitax/Korie` @ `be4bcaf` (branch `feature/compliance-portal-demo-rebuild`) · Spec: 100-§ "KORIEPAY SANDBOX DEVELOPER PORTAL"

---

## 1. What exists today (audited, not assumed)

### 1.1 Current developer surface — `src/app/developers` (21 routes + shell)
| Area | Pages | Notes |
|---|---|---|
| Shell | `layout.tsx` + `DeveloperShell.tsx` (534 L) | generic `w-64` sidebar, dark-slate accent chrome, sticky topbar; mobile = hamburger + full-screen overlay (no floating dock, no premium rail) |
| Dashboard | `/developers`, `/dashboard` | seeded client state |
| Discover | `/apis`, `/apis/[api]`, `/docs`, `/explorer`, `/sdks` | catalog from client seed |
| Sandbox | `/sandbox`, `/testing` | simulation UI, client-side |
| Integration | `/applications`, `/credentials`, `/webhooks`, `/events` | client-side CRUD + modals |
| Observe | `/logs`, `/errors`, `/usage`, `/status`, `/changelog` | seeded client tables |
| Org | `/team`, `/support`, `/settings` | client-side |

Components: `DeveloperContext.tsx` (591 L, all `useState`), `InteractiveApiExplorer.tsx` (392 L), `CredentialModal`, `WebhookModal`, `SandboxSimulatorModal`, `ProductionAccessModal`; seed data: `src/services/developerDataService.ts` (1 648 L — org/members/apps/credentials/apiProducts/webhooks/events/requestLogs/errors/rateLimits/statusNodes/SDKs/checklist/production request/support/audit).

**Critical finding — zero `fetch()` calls exist in any developer component or page.** The portal today is a fully client-local mock: explorer "simulateApiCall" fabricates responses in the browser, logs/webhooks/usage are static seeds, nothing calls the real engines or route handlers. Under spec §4 this is precisely the "fake sandbox" the spec forbids.

### 1.2 Real server-side platform (exists and authoritative — currently consumed only by `/admin/apis`)
- **Engines** (`src/lib/gateway/*`, `src/lib/integration/*`, in-memory singletons):
  - `ApiGatewayEngine` — `StandardApiResponse<T>` envelope `{ success, data, requestId (KP-REQ-…), correlationId, timestamp }`, `createResponse/createError`, idempotency check/record.
  - `DeveloperSandboxEngine` — deterministic scenarios via `x-simulation-scenario`: `SUCCESS`, `PROVIDER_TIMEOUT` (504/UNKNOWN), `INSUFFICIENT_FUNDS` (400 core-bank reject), `AML_STEP_UP` (403 challenge). Two copies exist (`gateway/` and `integration/`) — reconcile later.
  - `ApiGatewayRouterEngine` — route catalog + credentials: `getRoutes()`, `getCredentials()`, `createCredential()` (client id, key prefix, preview only).
  - `WebhookPlatformEngine` — `getDeliveries()`, `replayDelivery(id)` (seeded partner deliveries w/ attempts).
  - `IdempotencyEngine` — `checkOrStore` map.
  - Plus `PartnerManagementEngine`, `ProviderConnectivityEngine`, `ApiSecurityThreatEngine`, `EnterpriseEventBusEngine`, `WebhookDispatchEngine`.
- **237 route handlers** under `src/app/api`. Developer-relevant families: `v1/integration/{credentials,routes,providers,webhooks,events,summary,sandbox/simulate}`, `v1/webhooks/deliveries(+/[id]/replay)`, `v1/sandbox/simulate`, `v1/wallets(+/[id]/balance,/[id]/hold)`, `v1/payments(+/[reference]/verify)`, `v1/transfers/cross-border`, `v1/merchant/checkout + accounts/virtual`, `v1/agency/{authorize,cash-in,cash-out,agents,terminals,devices}`, `v1/fx/{corridor-rates,quote}`, `v1/kyc/verify-identity`, `v1/nip-gateway/outward`, `v1/providers(+/[code]/health)`, `health/*`, `gateway/clients`, `audit/trace`, `auth/*` (login/register/session/mfa/otp).
- **Auth**: demo auth stack exists (`api/auth/*` + `AuthContext`), but `/developers` is unauthenticated today.
- **Data model types**: `src/types/developer.ts` (env SANDBOX|PRODUCTION; roles OWNER/ADMIN/DEVELOPER/ANALYST/SUPPORT_CONTACT; categories payments/wallets/customers/kyc/merchant/agency/bills/fx_cross_border; key prefixes `kp_test_sec_` / `kp_live_sec_` per repo docs), `src/types/apiGateway.ts`.
- **Documentation truth**: `docs/` holds the full platform doc set — `api-catalog.md`, `api-reference.md`, `api-errors.md`, `api-authentication.md`, `api-versioning.md`, `api-rate-limits.md`, `api-webhooks.md`, `api-idempotency.md`, `developer-*.md`, `gateway-*.md`, `sandbox.md`, `production-access.md`, `webhook-platform-and-delivery.md` — to be mined for content (errors/events/schemas), not rewritten.

### 1.3 Truth-vs-fiction register (doc claims vs actual route files)
| Claim in repo docs/seed | Reality (route files / engines) | Decision |
|---|---|---|
| `POST /v1/customers` | no such route (identity via `customer/360`, `core/v1/identity/*` internal) | surface as documented product contract only where an engine-backed route exists; else **Coming Soon** |
| `POST /v2/nip-gateway/outward` | actual route is `v1/nip-gateway/outward` | use v1 |
| `/v1/bills/{electricity,airtime}` (IKEDC/AEDC/Airtel) | no `v1/bills` route; admin bill-payments module exists | **Coming Soon** (spec §84) unless wired to real module |
| Wallets support **USD** | repo-wide constraint: no customer USD; XOF first, NGN second | never USD in customer-facing examples; internal FX/treasury only |
| SDKs `@koriepay/node-sdk` GA w/ github repos | no SDK package code in repo; public repos unverified | mark **SDK unavailable — use REST** or demo-labeled (pending D3) |
| Rate-limit quotas (`initialRateLimits`) | no enforcement engine, no headers | do not render fake quotas; show docs policy + real request counts only |
| API request logs (`initialRequestLogs`) | no engine records developer requests (audit/trace is internal) | explorer/logs write-through to a server-side request-log store in the gateway envelope (new, engine-backed) |
| Webhook endpoints CRUD | engine covers deliveries + replay only | extend `WebhookPlatformEngine` with endpoint CRUD + signing secret, or mark scope |

---

## 2. Rebuild architecture decisions (proposed)

- **AD-1 Route**: rebuild in place at `/developers` (existing pages replaced piecewise); marketing pages (if any under `/developers` root `page.tsx` = landing/dashboard) re-skinned to workspace.
- **AD-2 Design system**: same premium floating-rail family just rolled to the other portals — light-first glass + token surfaces, `KorieFloatingRail` (developer tone: sky) + `KorieDock` + More sheet; dark mode deliberately designed; code panels dark-technical even in light mode (spec §8).
- **AD-3 No fake sandbox**: every interactive action that can be served by an existing engine-backed route calls it (`/api/v1/sandbox/simulate`, `v1/integration/*`, `v1/webhooks/deliveries…`). Where the platform genuinely lacks an engine (developer request log, rate-limit state, webhook endpoint CRUD), add a **controlled sandbox abstraction** (new `lib/gateway/developer/*` engines + route handlers) — deterministic, in-memory, labeled SANDBOX/DEMO — never touching the internal financial engines (treasury/ledger/cash are already separate singletons; developer sandbox stays in its own engine namespace).
- **AD-4 Environment**: domain/URLs from env vars with documented defaults; SANDBOX is the only *executable* environment in this build; PRODUCTION requires the approval flow (spec §43-44), credentials `kp_live_*` never generated without approval, never executed from the portal.
- **AD-5 Keys**: issue through `ApiGatewayRouterEngine.createCredential`-style server path; show full secret once; mask everywhere else; rotate/revoke = server-side state change + audit entry + confirmation dialog (spec §13-14).
- **AD-6 Docs & IA**: 6-group IA (Home / Develop / Sandbox / Applications / Observe / Team+Account) reduced from the 100-§ tree to *real* modules; bills/unsupported modules appear only as explicit "Coming Soon" rows, never fake endpoints (spec §84-85).
- **AD-7 Explorer**: executes via server routes only in SANDBOX env; response inspector shows status/latency/requestId/headers/body; every executed request writes a request log the user can jump to ("View request log", spec §79) and carries idempotency + `x-simulation-scenario` affordances.
- **AD-8 Truth rules**: response/error/event names from engines + `docs/api-*.md`; no invented webhook events; HTTP-accepted ≠ settled is taught explicitly (spec §57-58, §82).
- **AD-9 i18n & parity**: EN/FR/HA with the repo's locale parity gate; XOF-first currency ordering everywhere; every list has loading skeleton / empty / error states (spec §89-91).
- **AD-10 Security posture (demo-honest)**: no secrets in logs/state after reveal; request-log redaction helper; org/app/environment scoping enforced at the context + engine layer and the limitation (single-process demo isolation) documented on the portal and in this doc (spec §68-71 — enforced to the extent the demo runtime allows).

---

## 3. Phased execution plan (workstreams, each = commits + gates)

| WS | Work | Spec phases | Acceptance gate |
|---|---|---|---|
| W1 | Shell/design-system conversion: light-first re-skin, `KorieFloatingRail` + dock + More, IA restructure, org/app/environment switchers in rail context | 3, 6, 7, 8, 9, 50-52 | tsc 0, build green, /developers 200 w/ rail markup, mobile dock present |
| W2 | Dashboard + onboarding checklist (real-state driven), applications + credentials (server-issued keys, reveal-once, rotate/revoke, confirmations), settings/account | 10-14, 43-44 | key lifecycle round-trip through server route; checklist ticks only on confirmed state |
| W3 | Docs architecture: quickstart, API reference pages per real endpoint catalog (method/params/body/schema/errors/examples/codegen REST+cURL), auth, idempotency, errors center, versioning, changelog | 15-16, 23, 35-39, 45-48, 55-60, 82-86 | content mined from `docs/api-*.md` + engines; no endpoint invented |
| W4 | Explorer + sandbox: request builder → server execution, response inspector, request-id copy, log jump; sandbox dashboard, test data (customers/accounts/wallets), scenario engine (real scenarios), transaction lifecycle visualizations, reset w/ confirmations | 17-20, 24-28, 62-63, 79-81 | executed sandbox request returns engine-shaped response + writes request log; scenarios map to engine states |
| W5 | Webhook center: endpoint CRUD (extended engine), events (actual names), deliveries inspector, replay/retry, signing docs | 29-32, 80 | deliveries from server engine; replay works; event names match engine catalog |
| W6 | Observe + org: API logs table + request detail (redacted), usage/status (real counts, honest status), team/RBAC, production-access flow, notifications, ⌘K search, responsive/accessibility/performance QA pass | 33-34, 40-42, 49, 64-67, 77, 87-97 | all listed screens pass at 320→2560; keyboard reachable; a11y pass |

Spec §100 (final acceptance) is the definition of done; items that cannot be true in a demo runtime are stated as such on-screen and in the docs (marked DEMO) rather than faked.

---

## 4. Open decisions (D1-D4) — for product owner

- **D1** Rebuild in place at `/developers` (recommended) vs new `/developer` portal route.
- **D2** Confirm full 16-phase scope across sessions; start W1+W2 in the next working session (recommended) or a different slice first.
- **D3** SDK catalog: keep client-seeded "GA packages" as aspirational demo (labeled) vs honest "SDK unavailable — use REST" until real packages exist. Spec §21-22 demands the honest option unless labels are acceptable; compliance precedent = honest markers.
- **D4** Bills/VAS + Customers + remaining doc-claimed endpoints: mark all as explicit "Coming Soon" rows (recommended) rather than building new demo endpoints.

---

## 5. Progress log

- **W1 — Shell & design-system (done, `1c601d9`)**: DeveloperShell rebuilt — `KorieFloatingRail` sky/DEV + rail context cards (workspace, application+environment) + member footer; header moved into the content column (app selector, environment pill, ⌘K search, EN/FR/HA, ShellAccount); mobile `KorieDock` + full-section More sheet (environment + language + sign-out); production-switch warning and quick-search modals restyled to light-first tokens. tsc 0 · build 403/403 · `/developers` family 200.
- **W2 — Workspace engine foundation (done, `1797bea` + `06b3417`)**: `src/lib/developer/DeveloperWorkspaceEngine.ts` (server-owned org/apps/credentials/webhook-endpoints/request-logs/activity/onboarding + production gate; raw secrets revealed once; masked `kp_test_…` previews only in list/get; envelope via `ApiGatewayEngine`) + nine BFF routes under `src/app/api/developers/*`. Engine state is file-backed (`/tmp/korie-developer-workspace.json`, DEMO runtime, never in repo) because Next.js route handlers run in isolated module instances — every public method hydrates from / persists to the store (`06b3417`), so mutations on one route are instantly visible on others. Workspace payload now exposes `onboarding[]`, `counts{credentials,webhookEndpoints,requestsToday,requestsMonth}`, `credentialPreviews[]` (ACTIVE, masked) and `webhooks[]` (masked signing secret).
- **W3-a — Dashboard, Applications, Credentials pages re-served (this commit)**: all three pages dropped their client-mock sources and now read/write the engine through the BFF with explicit loading/empty/error states. Dashboard: KPI cards from `counts` (requestsToday is genuinely 0 until W4 sandbox traffic), onboarding checklist rendered from `workspace.onboarding` (ticks only when server confirms state; CTA links per pending step), credential/webhook summary cards from masked previews, real `requestLogs` feed with empty-state. Applications: server list + create modal (POST) + status transitions (deprecate/revoke with confirm dialogs; reactivate) + inline IP-whitelist editor (PATCH w/ server-side IPv4 validation). Credentials: environment filter, generate-key modal, reveal-once modal fed by create/rotate responses (`secretKeyRaw` appears exactly once per API response and nowhere else), rotate/revoke confirmations, production-access panel wired to the real status flow. `DeveloperProvider` now hydrates once from `GET /api/developers/workspace` into the shared shell state (other 18 pages untouched).
- **W3-b — Two engine-layer bugs found by the page rewiring (fixed this commit)**: (1) Next.js 14 statically caches GET route handlers that never touch the request — `/api/developers/workspace` served its first-response snapshot forever, which retroactively explained the W2 “route isolation” staleness. All developer GET handlers now `export const dynamic = "force-dynamic"`. (2) The `06b3417` hydrate-at-entry invariant made `getApplication()` hydrate mid-mutation: `rotateCredential`/`revokeCredential` mutated a credential, then called `getApplication()` (hydrate) which replaced the in-memory arrays and discarded the in-flight status change before `persist()`. Both methods now hydrate first and resolve the owning app without re-hydration. `requestProductionAccess`/`recordRequest` got the missing entry hydrate too. Verified fresh-boot: rotate → old key `ROTATING`+grace persisted; revoke → `REVOKED`+grace; deprecate/reactivate round-trip; IP whitelist valid/invalid; production issuance `FORBIDDEN` until approved; cross-route freshness; SSR 200 on all three pages; build 404/404 static + tsc 0.
