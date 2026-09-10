# 09 — Cross-portal audit: engine truth vs. simulation in every other portal

Status: **AUDITED + LIVE-PROBED** (prod build on :3000) · Date: 2026-09-10 · Branch: `feature/compliance-portal-demo-rebuild`

## Method

The admin console is closed (docs 05–08). This pass audits the remaining portals the same way the super-admin
review did: map each portal's data source, separate engine truth from simulation, and grade by harm. Every claim
below carries a file:line or a live transcript — nothing is asserted from memory.

## Scope map

| Portal | Pages | Fixture service | Live calls from portal code | Verdict |
| --- | --- | --- | --- | --- |
| customer `/customer` | 17 | `customerDataService` (569L, partial) | BFF-backed via `CustomerContext` | **Mostly engine-backed** — 4 findings |
| customer `/customer` | 17 | (same, shared context) | (same) | **Byte-identical tree — see PGAP-8** |
| agent `/agent` | 20 | `agentDataService` (269L) **orphaned** | `/api/agent/*` BFF | **Engine-backed** — 1 cleanup |
| support `/support` | 19 | `supportDataService` (918L, partial) | Book via `/api/complaints` (doc 07) | **As doc 07 describes** — unchanged |
| merchant `/merchant` | 16 | `merchantDataService` (422L) | **0** | **Fully static — PGAP-3** |
| aggregator `/aggregator` | 35 | `aggregatorDataService` (822L) | **0** | **Fully static — PGAP-4** |
| compliance `/compliance` | 41 | `complianceDataService` (634L) + `compliancePortalData` (709L) | **0** | **Fully static, partially labeled — PGAP-5** |
| developers `/developers` | 21 | `developerDataService` (1648L, partial) | Workspace engine + 3 pages | **Split — PGAP-7** |
| API platform `/api/*` | — | — | — | **2 critical findings — PGAP-1, PGAP-2** |

~6,000 lines of fixture service remain. 92 portal pages (merchant + aggregator + compliance) make zero live calls.

## Findings

### PGAP-1 · KYC verification always verifies; sanctions self-certified clean — CRITICAL

`POST /api/v1/kyc/verify-identity` (`src/app/api/v1/kyc/verify-identity/route.ts:30-44`) returns
`EXACT_MATCH`, confidence 99.4, `sanctions_pep_clean: true` and *"completed against national regulatory node"* for
**any** input. No verification source (NIMC/NIBSS/BVN) is consulted; no engine is called. The screening provider is
itself a 42-line simulation (`src/lib/aml/AmlScreeningProvider.ts:27`: *"checks against UN / OFAC / CBN / CENTIF mock
watchlists"*). No real sanctions list is consulted anywhere in the stack.

Live, this build, garbage input (`BVN 00000000000`, name "Xyz Qqq", self-minted bearer):

```
IDENTITY_VERIFIED · Identity verification completed against national regulatory node.
match_status EXACT_MATCH · confidence 99.4 · name_match true · sanctions_pep_clean true
```

Harm: every current and future integrator wiring KYC to this endpoint performs phantom verification — identities
"verified", sanctions "cleared", nothing checked. This is the most dangerous endpoint in the tree.

### PGAP-2 · Format-only auth: any self-minted bearer authenticates with full scopes — CRITICAL

`src/lib/security/authMiddleware.ts:35-52` — any bearer starting with `kp_test_`/`pk_test_`/`kp_live_`/`pk_live_`
(or any token ≥16 chars) authenticates with a **fixed full-scope grant** (`payments:write`, `wallets:write`,
`agency:write`, `fx:quote`, …). No key-registry lookup, no per-key scopes, no revocation. Environment is
self-declared by prefix — minting a `kp_live_` string makes you PRODUCTION. The code admits it
(*"In production, validate token against Supabase / Key Vault"*).

Live: `Bearer kp_test_i_just_made_this_up_12345` → 200 with live liquidity positions.

Consequence for the portals: the "API keys" displayed in the merchant console (`merchantDataService.ts:378-394`,
a PRODUCTION key "used 2 mins ago") and developer console (`developerDataService.ts:117+`) are theater — any string
works, and rotating/revoking a key client-side changes nothing. Credential management UI over format-only auth is a
promise the platform cannot keep.

### PGAP-3 · Merchant portal: 16 pages, zero live calls — HIGH

`MerchantContext` makes 0 fetches; no merchant page calls any API. Rendered as operating truth:

- a **PRODUCTION** API key "used 2 mins ago" (`merchantDataService.ts:378-394`) that authenticates nothing (see PGAP-2);
- a ₦4,820,000 **SETTLED** batch with a NIBSS session id (`:344-360`) — a merchant could believe ₦4.7M reached their bank;
- disputes (`:411-422`) disconnected from `DisputeChargebackEngine`, which has admin + customer surfaces — a merchant
  "resolving" a dispute here tells the engine nothing; the dispute stays open everywhere else;
- a webhook endpoint at 99.8% success, *"lastDelivery: Just now (HTTP 200)"* (`:399-410`) — deliveries that never fired.

Unused engines that could back it: `SettlementEngine` (real create/approve/execute state machine,
`src/lib/settlement/SettlementEngine.ts:108-273` — seeds unlabeled, no `isSeed`) and `DisputeChargebackEngine`.

### PGAP-4 · Aggregator portal: 35 pages, zero live calls — HIGH

`AggregatorContext` makes 0 fetches; no aggregator page calls any API. Rendered as network truth: ₦42.85M main
wallet and HEALTHY liquidity (`aggregatorDataService.ts:529-541`), ₦184.9M lifetime commissions (`:543-560`), a
₦74.2M COMPLETED settlement with NIBSS session id (`:562+`), reconciliation rows with variance 0 / MATCHED across
internal, provider and bank totals (`:602+`) — a reconciliation console structurally incapable of finding a break —
and a compliance queue approving CAC certificates (`:689-711`).

`ExceptionEngine` exists and is engine-truth elsewhere (GAP-1 reads it) but is unused here; settlement batches could
move to `SettlementEngine`.

### PGAP-5 · Compliance portal: sanctions/PEP/AML screens carry no demo label — HIGH

41 pages, 0 live calls; two fixture contexts. Credit: 23 pages render `DemoStrip` → *"Sample data for demonstration"*
(`src/locales/compliance/en.ts:131`). But 18 pages carry **no** demo/mock/sample string at all — including the
highest-harm ones: `/sanctions` (hardcoded KPI **1,840 screenings** + fixture matches with list names, matched
fields and scores, `src/app/compliance/sanctions/page.tsx:17-41`), `/pep`, `/aml`, KYC/KYB detail, investigations,
restrictions, approvals, and the home screen. `PORTAL_DEMO_MODE = true`
(`src/services/compliancePortalData.ts:36`) exists but **nothing reads it** — the flag is set and never surfaced.

Real engines exist and are unused: `AmlAlertEngine`, `AmlCaseManagementEngine`, `AmlCustomerRiskProfileEngine`,
`AmlNetworkGraphEngine`, `AmlScenarioEngine`, `RiskDecisionEngine`, `RiskSignalEngine`, `VelocityEngine`,
`EntityRiskProfilingEngine`, `FraudCaseManagementEngine`, `RegulatoryComplianceEngine`. (Screening itself has no real
engine — see PGAP-1.)

### PGAP-6 · Merchant checkout mints unroutable virtual accounts — HIGH

`POST /api/v1/merchant/checkout` returns 201 with an account from
`ProvidusBankAdapter.generateDynamicVirtualAccount` (`src/lib/services/ProviderService.ts:64-81`): **`9928` + 6
random digits** — no check digit, no registry, no reservation, so two checkouts can mint the same number and the
number routes nowhere. The `checkout_url` points at `pay.koriepay.com`, which does not resolve in this deployment,
and nothing tracks expiry or settlement. Contrast: `AccountLifecycleEngine` mints check-digit-valid NUBANs — the
adapter does not even do that.

### PGAP-7 · Developer catalog documents endpoints that 404; status page repeats GAP-1's fiction — MEDIUM

Sampled 10 documented paths (`developerDataService.ts:202-855`): 6 exist, 4 are missing
(`/v1/payments/{ref}/verify`, `/v1/wallets/create`, `/v1/customers`, `/v1/bills/electricity`), and the whole
documented `/v2/nip-gateway` tree is absent — live probe: `POST /api/v2/nip-gateway/outward → 404`. A developer
integrating from the catalog hits 404s with no COMING_SOON marking.

Elsewhere in the portal: credentials, request logs, error analytics, rate limits, webhooks, incidents and audit are
`useState(initial*)` fixtures (`DeveloperContext.tsx:115-122`) — a developer debugging against request logs that
never happened. The status page shows Providus/Coris **OPERATIONAL**, 99.94%/99.88% uptime, *"30 seconds ago"*
(`developerDataService.ts:1328+`) — GAP-1's fiction class, while the admin hub holds **real probe history** that
could back it. Engine-backed and working: workspace org/members/applications (`DeveloperWorkspaceEngine`,
200 live) and `/api/developers/requests`.

### PGAP-8 · `/customer` and `/customer` are byte-identical trees — MEDIUM

`diff -rq src/app/customer src/app/customer` → empty. 34 pages maintained twice; every customer-portal fix — including
PGAP-9 and PGAP-10 below — must land twice or the portals drift. Both serve 200 live. One tree plus a redirect is the
fix; until then this audit's customer findings apply to both paths.

### PGAP-9 · Receipts fallback serves fixture receipts with weak ownership — MEDIUM

`GET /api/customer/receipts/[id]` reads the live `TransactionService` store first (good) but falls back to the
`CUSTOMER_TRANSACTIONS` fixture, returning **canonical receipts for fabricated transactions**. The ownership guard
on fallback rows is a single hardcoded id check (`tx-cust-999`), and the route comment concedes the sandbox
assumption. Any authenticated customer can pull receipts for every seeded row.

### PGAP-10 · FX catalog fallback renders as a live quote — LOW

The fx page prefers the engine rate and falls back to static `FX_RATES` for unserved pairs
(`src/app/customer/fx/page.tsx:24-31`) — honest in code, but the UI shows no indicative label while a 60-second
countdown implies an expiring live quote. The swap itself is client-side only until send-money. Small fix: badge the
source.

### PGAP-11 · Dead and misleading artifacts — LOW

- `src/services/agentDataService.ts` (269L) is orphaned — its only mention is a comment in `AgentContext.tsx:9`
  (*"the previous context imported agentDataService mocks"*). Safe to delete; `tsc` will confirm.
- `MOCK_SUPPORT_TICKETS` is still exported but feeds only the disclosed simulation layer (doc 07) — unchanged, no action.
- `SettlementEngine` seeds carry no `isSeed` — label before wiring portals to it, or seed batches will read as history.

## What is genuinely engine-backed (credit where due)

- **Customer/customer**: `CustomerContext` over `/api/customer/portal/*` (transfer, transactions, beneficiaries,
  disputes, fx, CSAT, verification, notifications) — live money, owner-scoped.
- **Agent**: `/api/agent/*` BFF (`CashPositionEngine`, portal summary, services, bills POST, fx POST, bill-pay) —
  the till is real.
- **Developers**: workspace org/members/applications over `DeveloperWorkspaceEngine`; applications/credentials pages
  POST/PATCH real workspace APIs.
- **Support**: ticket book over `/api/complaints` (doc 07); remaining fixtures disclosed in-product.
- **v1 API**: most documented routes exist and are auth-gated; the gaps are the four missing paths, the v2 tree, and
  the two critical behaviors above.

## Roadmap (by ROI)

1. **KYC**: put a real verification source behind `verify-identity` or return honest `UNVERIFIED`; kill the
   always-match. Until then mark the endpoint EXPERIMENTAL in the catalog. (PGAP-1)
2. **Auth**: credential registry + per-key scopes + revocation; environment from the key record, never the prefix.
   Then the portals' key-management UI becomes real. (PGAP-2)
3. **Compliance**: extend `DemoStrip` to all 41 pages and surface `PORTAL_DEMO_MODE`; then wire the AML/risk engines'
   reads; screening needs a real list decision, not a provider stub. (PGAP-5)
4. **Merchant/aggregator**: settlements to `SettlementEngine` (after `isSeed`), merchant disputes to
   `DisputeChargebackEngine`, reconciliation breaks to `ExceptionEngine`; webhooks to a real outbox or label
   configured-not-firing. (PGAP-3, PGAP-4)
5. **Checkout**: mint via `AccountLifecycleEngine` + reservation registry + settlement tracking. (PGAP-6)
6. **Catalog**: mark missing endpoints COMING_SOON; status page reads admin probe history. (PGAP-7)
7. **Hygiene**: collapse `/customer` → `/customer`; label seeded receipts + real ownership; badge FX fallback quotes;
   delete `agentDataService`; `isSeed` on settlement seeds. (PGAP-8–11)

## Verification (live, prod build, this session)

```
PROBE 1 — POST /api/v1/kyc/verify-identity {BVN 00000000000, "Xyz Qqq"} (self-minted bearer)
  → IDENTITY_VERIFIED · EXACT_MATCH · 99.4 · sanctions_pep_clean true
    "Identity verification completed against national regulatory node."
PROBE 2 — GET /api/bank/v1/liquidity, Bearer kp_test_i_just_made_this_up_12345
  → 200, live positions (format-only auth confirmed)
PROBE 3 — POST /api/v2/nip-gateway/outward (documented) → 404
surfaces — /merchant, /aggregator, /compliance, /compliance/sanctions, /customer,
  /customer, /agent, /developers, /support → all 200
```

No code changed this pass — audit only. Gates untouched (build ✓ to serve the probes).
