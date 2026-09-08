# Agent Portal — Product Services Integration (Stage 4): every database live

Date: 2026-09-08 · Branch: `feature/compliance-portal-demo-rebuild`
Owner decisions (AskUser 2026-09-08): **all five pillars live** · **cash-at-the-till core rail, opened
KoriePay accounts as the customer's ledger of record** · **full ATM/card lifecycle engine** · **services hub +
automation layer**.

---

## 1. The deep business model — what the agent serves

A KoriePay agent (persona `agt-ng-001`, Garba Express, Abuja) serves walk-in customers five products. Every
product ends in one of three places: a **double-entry journal on the ledger**, a **customer wallet liability
movement**, or an **engine record** — never a client-side constant.

| Pillar | Page | Cash/rail model | Ledger truth |
|---|---|---|---|
| 1. Deposit | `/agent/cash-in` (upgraded) | Customer pays physical cash at till. No account → e-float model (today). With opened account → **wallet deposit**: till cash in, customer wallet liability credited. | DR `acc_asset_agent_cash_ngn` · CR `acc_liab_customer_wallets_ngn` (+ wallet subledger) |
| 2. Withdrawal | `/agent/cash-out` (upgraded) | Till pays cash. Account mode debits the customer wallet (balance-guarded); walk-in mode uses the float model (today). | DR `acc_liab_customer_wallets_ngn` · CR `acc_asset_agent_cash_ngn` (+ wallet subledger) |
| 3. Account opening | `/agent/customers` + `/agent/accounts` | Free, engine-validated (KYC tier vs product `minKycTier`), real account number minted by `AccountLifecycleEngine.openAccount` (Providus NGN), wallet subledger auto-provisioned. | record in `AccountLifecycleEngine` (accounts master) + `SubledgerEngine` (`CUSTOMER_WALLET`) |
| 4. ATM / card application | `/agent/cards` (new) | Fixed issue fee collected in cash at till; fee split engine-config 60/40. Application lifecycle transitions **only by explicit events**: received → verified → at issuer → issued → delivered (cancel allowed pre-issue). | DR `acc_asset_agent_cash_ngn` · CR `acc_liab_agent_commissions_payable_ngn` + `acc_rev_tx_fees_ngn` |
| 5a. BDC / FX conversion | `/agent/fx` (new) | Corridor desk NGN↔XOF at **engine reference rates** (`FxPositionEngine`: NGN/XOF 0.3920 XOF per ₦). Till collects (buy XOF) or pays out (sell XOF); margin = quoted spread (desk config). XOF leg settles via treasury corridor float (documented seam). | Buy: DR cash · CR corridor payable + commissions payable (margin). Sell: DR corridor advance · CR cash + commissions payable |
| 5b. Bills & top-ups | `/agent/bills` (new) | Airtime / data / electricity / cable / internet. Customer pays principal + service charge in cash at till. | DR cash (total) · CR `acc_liab_biller_settlements_ngn` (principal) + commissions payable + fee revenue |

**Automation & intelligence layer (deterministic, engine-sourced):**
- **One operation stream**: every product above writes an `AgentPortalOperationType` into `AgentKioskStore` →
  transactions history, commissions, receipts and the service hub KPIs all derive from the same engine rows.
- **Idempotency keys** on every money move (stable `agent-{product}-{key}`) — replays return the cached record.
- **Guardrails**: single-op ₦200,000 cap (existing) + per-product min/max from engine config, till-cash checks
  on every till payout, wallet balance checks on wallet debits, duplicate/velocity rejection via idempotency.
- **Live state**: eligibility rules rendered from engine config (product ACTIVE, KYC tier, country/currency),
  next-action hints per lifecycle (cards), freshness bars on every page.

## 2. "Every database" — connectivity matrix (what backs every number on screen)

| Runtime store / engine seed | Kind | Portal surfaces it feeds |
|---|---|---|
| `LedgerService` (chart + journals, `/tmp/korie-ledger-store.json`) | DB | All journals, references, receipts; **new chart accounts self-heal** into persisted stores |
| `AgentKioskStore` (`/tmp/korie-agent-kiosk.json`) | DB | Ops, till, served customers, settlements, idempotency map |
| `AgentPortalEngine` facade | Service | Dashboard/summary, executeOperation (incl. account-mode deposit/withdrawal) |
| `CustomerLifecycleEngine` (customer master) | DB/Service | Onboarded customers, KYC tier, risk |
| `AccountLifecycleEngine` (accounts master + `openAccount`) | DB/Service | Opened KoriePay accounts, account numbers (**newly connected**) |
| `SubledgerEngine` (`CUSTOMER_WALLET`, AGENT_FLOAT) | DB | Wallet available balances, float, wallet mutations |
| `BankingProductFactory` | Config DB | Account product eligibility (code/KYC/jurisdiction/limits) |
| `FeeAndCommissionEngine` | Config | Agency 60/40 splits (existing ops); product fee rules in service engines |
| `CardIssuanceEngine` (new store `/tmp/korie-card-apps.json`) | DB (new) | Card products + application lifecycle state machine |
| `BillerCatalogEngine` (seed catalog + service-charge config) | Config DB (new) | Biller list, min/max, service charge, category |
| `FxPositionEngine` | Config DB | NGN/XOF + USD/NGN reference rates, exposure, status (rate truth) |
| `FxDeskEngine` (new store `/tmp/korie-fx-orders.json`) | DB (new) | Corridor orders, margin bps config, caps |
| `TerminalManagementEngine` / `DeviceTrustEngine` | Service | Terminals page |
| `ComplaintDisputeEngine` | DB/Service | Support tickets |
| `SettlementEngine` | Service | Settlements page |
| `CashReconciliationEngine` | Service | Cash counts |
| `AdashiStore` | DB | Savings-circles console (previous stage) |
| `AgentPortalSummary` view model | Projection | Rebuilt every request from the rows above — nothing is stored client-side |

**Fix of canonical fiction found in audit:** `/api/v1/fx/quote` and `/api/v1/fx/corridor-rates` hard-code
rates (0.43 / 2.31) and mint random quote ids with no engine or ledger. Stage 4 binds rate truth to
`FxPositionEngine` and journals every conversion; the fake literals are removed from those routes.

## 3. New ledger chart accounts (self-healing on persisted stores)

`acc_liab_biller_settlements_ngn` · `acc_liab_agent_commissions_payable_ngn` ·
`acc_liab_fx_corridor_payable_ngn` · `acc_asset_fx_corridor_advance_ngn`

## 4. API surface (all `withAgentAuth`, `payments:read|write`, bearer discipline)

- `GET/POST /api/agent/billers` — catalog + payments
- `GET/POST /api/agent/cards` + `PATCH /api/agent/cards/[id]` — products, applications, lifecycle events
- `GET/POST /api/agent/fx` — rate board (engine rates) + corridor orders
- `GET/POST /api/agent/accounts` — accounts of kiosk customers + open account
- `GET /api/agent/services/overview` — hub: product availability, limits, today's product KPIs
- `/api/agent/operations` extended: optional `accountNumber` → account-mode deposit/withdrawal

## 5. Verification plan

1. `tsc --noEmit` + `npm run lint` + `npm run build` clean from fresh `/tmp` stores.
2. Prod-server smoke: SSR 200 on `/agent/services`, `/agent/bills`, `/agent/fx`, `/agent/cards`,
   `/agent/customers`, `/agent/cash-in`, `/agent/cash-out`.
3. Live flows over BFF: open account (customer + NGN product) → account-mode deposit → bill payment
   (journal: cash / biller settlements / fee / commission) → card application through lifecycle to delivered
   (fee journal) → FX buy & sell conversions (engine-rate check, margin split, caps rejection case) →
   idempotent replays on each money move.
4. Evidence captured verbatim (references, journal ids, rates) into
   `docs/agent-portal-rebuild/04-services-verification.md`; commit in staged units.

## 6. Honesty bounds (non-goals)
- XOF delivery is a treasury-corridor seam: the NG till books naira legs; XOF legs live in corridor float
  (treasury engine) — documented, not faked on the till.
- USD/NGN shows the treasury market card only (no USD till vault in demo).
- Accounts open in seconds in demo (no 24h clearing simulation); card issuance advances only via explicit
  agent/issuer events — never auto-approval.
- Locale copy (`ha`/`fr`) for new pages deferred to the post-stabilization locale pass.
