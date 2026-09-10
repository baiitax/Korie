# 05 — GAP-1 remediation: executive home reads engine truth

Status: **IMPLEMENTED + GATES GREEN + LIVE-VERIFIED** (prod build on :3000) · Date: 2026-09-10 · Branch: `feature/compliance-portal-demo-rebuild`

## What was asked (verbatim)

> `CommandCenterOverview` renders from `@/services/adminDataService.ts` — 773 lines of hand-written arrays.
> The top intelligence strip literally claims "✓ All primary banking nodes (Providus & Coris) operational"
> from static data. A super-admin console whose headline numbers are canned teaches leadership to trust
> fiction, and every downstream decision — capital calls, node failover, partner escalations — inherits that
> risk. *Remediated in part this pass; the static panels remain flagged for phased replacement.*

Objective: headline telemetry (nodes, volumes, liquidity, participants, transactions) must come from real
engines/stores; any panel that is not yet replaceable must be **explicitly flagged** ("phased replacement")
instead of being presented as live.

## The problem, precisely

| Before | Why it is dangerous |
| --- | --- |
| "✓ All primary banking nodes (Providus & Coris) operational" from a hard-coded string | Leadership would not investigate a real outage |
| Canned volume / liquidity / participant figures in `adminDataService.ts` | Capital calls and partner escalations sized on fiction |
| Demo approval requests shown as a queue | Implied a maker–checker recorder that does not exist |
| Single blended "cleared value" | Would have summed ledger postings **and** bank-core ops — the same money twice |

## What was built

**1. `GET /api/admin/overview/executive?country=GLOBAL|NG|NE`** — `src/app/api/admin/overview/executive/route.ts`
- `force-dynamic`, `ApiGatewayEngine.createResponse/createError`; hard failure returns `500 EXECUTIVE_TRUTH_UNAVAILABLE` rather than a plausible-looking fallback.
- Aggregation lives in `src/lib/admin/ExecutiveTruthService.ts` (`getSnapshot`).

**Engines actually read** (returned in `sources[]` with availability + record counts, so the UI can prove provenance):

| Panel | Engine / store |
| --- | --- |
| Banking nodes, probe history, routing roles | `AdminConfigurationEngine` (BANK_NODE) + `BankCoreEngine` |
| Journals, double-entry lines | `LedgerService` (`listTransactions` / `listAccounts` / `listHolds`) |
| Bank-core rail operations (INBOUND_CREDIT / NIP_OUT / …) | `BankCoreEngine` |
| Wallet float + per-account positions | `SubledgerEngine` |
| Customers / accounts / agents | `CustomerLifecycleEngine`, `AccountLifecycleEngine`, `AgentManagementEngine` |
| Reconciliation exceptions | `ExceptionEngine` |
| Merchants, BDCs, approvals | **no engine exists → `null` + source note** |

**2. Rails are never implied to be live.** `railMode` is `LIVE` **only** when a node is `CONNECTED` **and**
`PRODUCTION` **and** has a secret configured; otherwise `SIMULATED`. `ProviderConnectivityEngine` is a seeded
simulation and is deliberately **not** surfaced as node telemetry.

**3. Honest-withheld states, not estimates.**
- `pendingApprovals: null` → the tile renders disabled: **"Review Queue — not wired"**. (The only maker–checker engine in the repo is `AdashiMakerCheckerEngine`, an adashi-domain engine; no admin approval recorder exists.)
- `merchants: null`, `bdcs: null` → tiles read **"withheld"** with a source note; no registry engine exists, so nothing is invented.
- Unprobed nodes read `UNVERIFIED`; the headline statement says so in words.

**4. No double counting.** Ledger postings and bank-core operations are reported as **two separate series**
(`ledgerClearedMinor24h/Total` and `bankClearedMinor24h/Total`). A bank-core movement also posts a journal,
so adding them would double-count. The API emits a warning saying exactly this, and the UI prints both lines.

**5. `/admin` (`CommandCenterOverview.tsx`, rewritten).** Truth snapshot on mount + 30 s silent refresh;
nodes grid with last-probe status; cleared/success/float cards; registry tiles (withheld states);
truth feed (≤12 most recent `LEDGER_JOURNAL POSTED` + `BANK_TXN` rows) opening a **local truth-inspector modal**
that shows the posted double-entry lines — the old `EntityDrawer` dependency is gone.

**6. `/admin/banking-nodes` (rewritten).** Live probe (`POST /api/admin/config/connectors/[id]/probe` — real
HTTP GET to `baseUrl`+`healthPath`, 6 s abort) and real routing-role changes
(`POST …/[id]/role` `{role:'PRIMARY'|'FAILOVER'}`). The fake client-side ping and the demo failover were removed.

## Verification (live, prod build)

Probes run from the sandbox: `PROV-NG-01` → `FAILED NETWORK_UNREACHABLE`; `KORIS-NE-01` → `NO_BASE_URL`
(no base URL configured). **The sandbox has no outbound network — these are correct recorded truths, not bugs.**
Headline: *"0/2 banking nodes connected at last probe (2 probed, 1 failing)"*.

After real activity (accounts `0169951140`/`0248491827`, funding ₦75,000, P2P ₦30,000, NIP_OUT ₦5,000):

| Figure | Value | Note |
| --- | --- | --- |
| NGN journals 24h | 3 / 3 all-time | moved from 0 |
| Bank-core txns | 5 | INBOUND_CREDIT, NIP_OUT, ACCOUNT_OPEN |
| Ledger value posted 24h | ₦110,010.00 (minor 11,001,000) | includes ₦10 NIP fee |
| Bank-core rail ops 24h | ₦110,000.00 (minor 11,000,000) | same movements, no fee — hence two series |
| Success rate | 100 % over a 5-record sample (was `null` without status-bearing records) | |
| Nostro `providus_ng` | ₦25,000,000 → ₦25,070,000 | |
| Wallet float NGN | ₦154,719,990.00 minor across 5 accounts | XOF 230,000,000 minor / 2 accounts |
| GL `1010-BANK-SETTLE-NGN` | 7,000,000 moved, `isRegistrySeed:false` | pools `1010-PROV-NGN-POOL` / `1020-KORIS-XOF-POOL` `seed=true` (labelled) |
| Entities | 5 customers / 5 accounts / 3 agents | merchants + BDCs withheld |
| Exceptions | 1 open | |
| Truth feed | 8 rows | e.g. `BK-CREDIT-MTUUMLO6-3` + paired 2-line journal |

Gates: `npx tsc --noEmit` 0 · `npx next lint` clean for touched files · `npx next build` ✓
(`/admin` 9.95 kB, `/admin/banking-nodes` 5.74 kB, `/api/admin/overview/executive` ƒ). Route smoke all 200.

## Flagged for phased replacement (unchanged this pass)

`src/services/adminDataService.ts` (773 lines) still feeds `/admin/{bdc,merchants,transactions,transfers,wallets}`.
Those pages are the declared next phase; until each is migrated it should be treated as demo data, and this doc
plus the API `sources[]` block is the record of what is *not* yet truth-backed.

## Runtime note (avoid mistaking a wipe for a regression)

Truth stores are runtime-backed: `LEDGER_STORE_PATH` defaults to `/tmp/korie-ledger-store.json`. A sandbox
restart wipes them, so the console legitimately shows zero volumes and an empty feed until activity recurs —
that is the honest empty state, not a defect.
