# Agent Portal — Review, UX Revival & Engine Wiring

Date: 2026-09-08 · Scope: `baiitax/Korie` @ `4129f96` · Status: **decisions locked; build in progress**

## Owner decisions (AskUser 2026-09-08)
- **D-A1 Persona/data truth**: adopt the engine persona `agt-ng-001` (Garba Express Services & POS, Abuja, TID-NG-009182) as the portal identity everywhere; remove the mock Kano persona from the agent surfaces.
- **D-A2 Design language**: adopt the customer portal design language (light theme, same component families/states) across the agent portal.
- **D-A3 Revival scope**: full pass — all 15 pages wired to engines via a new `/api/agent/*` BFF.
- **D-A4 Adashi console**: include now — privacy + auth + engine-state wiring for `/agent/adashi`.

## 1. Audit findings (evidence)

### 1.1 Portal architecture today
- 15 pages under `/agent` + `AgentProvider`/`AgencyShell`. **Every page reads static mock
  constants** from `src/services/agentDataService.ts` through `AgentContext` (438 LOC):
  `CURRENT_AGENT`, `INITIAL_LIQUIDITY`, `AGENT_CUSTOMERS`, `AGENCY_TRANSACTIONS` (4 seeded
  rows), `DAILY_RECONCILIATIONS` (1 row), `ACTIVE_TERMINAL`, `AGENCY_ALERTS`.
- **There is no agent API surface**: only `/api/agents/*` + `/api/v1/agency/agents` exist and
  serve back-office/admin, not the kiosk. No `/api/agent/*` BFF, no auth on agent pages, no
  engine imported by any page. Client ops mutate React state only.
- Ops fabricate references: `KP-2026-CSHIN-${Math.floor(Math.random()*90000)}`,
  provider `PRV-INW-{rand}` — no ledger, no journal id, no float ledger movement, no idempotency
  guard beyond a local `if (walletFloat < amount)`.

### 1.2 Ghost / dead pages (user-facing evidence)
| Page | Symptom | Real engine that exists and is unused |
|---|---|---|
| `/agent/settlement` (92) | **Hard-coded 2-row array** `stl-0091/0090`; nothing renders from state | `src/lib/settlement/SettlementEngine.ts` (batches, eligibility, disbursement) |
| `/agent/support` (113) | Ticket submit flips local `isSent`; **no persistence**, no ticket id, no engine | `src/lib/complaints/ComplaintDisputeEngine.ts` (`createComplaint`) |
| `/agent/liquidity` (120) | “Sync Float” = `setTimeout` + canned message | `CashPositionEngine`, `LiquidityOperationsEngine`, `CashLocationEngine` |
| `/agent/customers` (125) | “Onboard New Customer” = `alert()`; search over 3 static rows | (customer master + cash orchestration counterparties) |
| `/agent/terminals` (103) | Static telemetry card; no heartbeat/status actions | `TerminalManagementEngine`, `DeviceTrustEngine`, `src/lib/terminals/TerminalManagementEngine` |
| `/agent/commissions` (126) | **Hard-coded breakdown** (₦18,500/₦14,200/…) and “₦184,200 weekly” literals | `FeeAndCommissionEngine`, `SettlementEngine` |
| `/agent/profile` (73) | Static context only — fine as read page but unverified against registry | `AgentManagementEngine.getAgent` |
| `/agent/reconciliation` (94) | Reads context-local rows + modal; nothing server-side | `CashReconciliationEngine.submitCashCount`, `DailyEodReconciliationEngine` |
| `/agent/cash-in` (238), `/agent/cash-out` (282), `/agent/transfer` (209) | Context math, random refs, no journal | `CashOrchestratorEngine.processCashIn/Out` (+`DoubleEntryLedgerEngine`), `FeeAndCommissionEngine` |
| `/agent/transactions` (172) | 4 static rows; CSV export is client-side over the mock | (orchestrator ledger output; portal transactions pattern) |
| `/agent/adashi` (768) | Legacy console calling unauthenticated `/api/v1/adashi/*`; roster shows full PII; no privacy (customer side already fixed — agent console is the remaining leak) | Adashi engine estate + customer BFF pattern |
| `/agent/settings` (93), `/agent/page` dashboard | Dashboard computes “100% Success” statically; settings OK (locale) but not persisted server-side | — |

### 1.3 Identity & scope
- Kiosk persona `ag-usr-0042` / Alhaji Garba Sani / Kano (`POS-NG-KAN-0042`) exists **only in the
  mock service** (+ copy in `adminDataService`). Engine-land Nigerian demo agent is
  `agt-ng-001` / AGT-NG-0092 / **Garba Express Services & POS** (Musa Garba Enterprise, Abuja
  AMAC, terminal `TID-NG-009182`, float ₦1,850,000, till “Garba Express POS Cash Till” in
  `CashPositionEngine`). Names coincide on “Garba”; ids/regions/balances do not.
- Auth middleware maps any sandbox bearer to `usr_dev_01` (customer portal persona). **No agent
  identity resolution exists** — an `agentScope` resolver must be built (mirroring
  `customerScopeFromRequest`) for an agent BFF.
- Escrow/AGENT_FLOAT: `SubledgerType` has `AGENT_FLOAT` but no seeded agent subledger;
  `LedgerService` chart has agency float pools? (verified in earlier work: customer wallet
  liability + adashi escrow pools exist; agent float account `acc_asset_agent_cash_*` was added
  for collections-in-transit). Agent float ledger wiring needs its own chart/subledger entries.

### 1.4 UX gaps vs the customer portal approach
- No loading/skeleton, error, empty or freshness states; a failure renders the same stale mock.
- No normalized API errors; a11y gaps (icon-only buttons without labels in places, `alert()` use,
  low-contrast microcopy); CSV export duplicated logic client-side; dates rendered raw.
- Design language is a **dark navy/amber kiosk**; customer portal is a light system with shared
  state components (`DataErrorState`, `DataEmptyState`, `DataFreshnessBar`, skeletons,
  normalized `safeFetch` + `normalizeStatus`, receipt modal, live-status chips, owner-scoped
  `/api/customer/*` BFF + `portalFetch` bearer discipline, i18n en/fr/ha).

## 2. Proposed approach (pending owner decisions)
1. **Agent identity + scope**: new `agentScope`-style resolver + sandbox mapping to the engine
   agent `agt-ng-001`; agent BFF routes under `/api/agent/*` (auth + ownership, mirroring
   `/api/customer/*`).
2. **Engine wiring (revival)**: settlement, support (tickets), reconciliation (cash counts),
   liquidity (real positions + sync through orchestrator), commissions (FeeAndCommission +
   settlement batch totals), cash-in/out/transfer through `CashOrchestratorEngine` +
   ledger/subledger with real references + idempotency, dashboard/transactions from engine
   output, profile/terminals from registry + device trust.
3. **Customer design approach adapted**: shared state components, freshness bars, receipts,
   skeleton/empty/error, a11y, i18n keys parity (en/fr/ha agency), responsive continuity.
4. **Adashi console**: privacy + engine-state follow-up (defer decision Q4).

## 3. Open decisions → AskUser
Q1 persona/data truth, Q2 design language, Q3 revival depth, Q4 adashi console scope.
