# Agent portal Stage 4 — services hub & product engines: verification evidence

Date: 2026-09-08 · Branch: `feature/compliance-portal-demo-rebuild`
Scope: **Stage-4 product services** on the agent portal — account opening, ATM/card lifecycle, BDC FX desk, bills & top-ups, and the account rail on deposits/withdrawals. Every figure below was returned by the live prod server (`next start`, seeded `/tmp` runtime stores) through the sandbox bearer credential; nothing is hand-written into the UI.

---

## 1. What changed (code surfaces)

| Surface | Notes |
|---|---|
| `src/lib/agent/AccountServiceEngine.ts` | Openable products read from `BankingProductFactory` (ACTIVE · NG · NGN · minKycTier); `openAccount` mints real accounts via `AccountLifecycleEngine.openAccount` (number + auto-provisioned wallet subledger); duplicate guard per customer/product; idempotent via kiosk store; kiosk op `ACCOUNT_OPENING`, `serviceRef` = account number |
| `src/lib/agent/CardServiceEngine.ts` | Seeded card products (KORIE_ATM_DEBIT_NGN ₦2,500/TIER_1/7–10 days; KORIE_ATM_DEBIT_PREMIUM_NGN ₦5,000/TIER_2/4–7 days); event-only lifecycle; issue-fee journal DR till cash · CR commissions payable 60% · CR fee revenue 40%; `maskedCardRef` set **only** at ISSUED; runtime store `/tmp/korie-card-apps.json` |
| `src/lib/agent/FxDeskServiceEngine.ts` | Corridor truth from treasury `FxPositionEngine` (`NGN/XOF` reference); BUY_XOF +250bps / SELL_XOF −200bps on the ₦/XOF desk rate; min 1,000 XOF; single-op ₦200,000 cap; daily ₦1,000,000 desk cap; naira-leg journals only (corridor float seam documented); runtime store `/tmp/korie-fx-orders.json` |
| `src/lib/agent/BillerServiceEngine.ts` | 12 biller catalog (6 categories) with per-biller service charges; cash-at-till payment journal; **fix this pass**: 60/40 commission split is now computed on the biller's catalogue service charge (was being fed through `FeeAndCommissionEngine.calculateAgencySplit`, which sizes its own ₦100 flat customer fee from the principal and produced a negative platform fee for ₦50/₦100 billers) |
| `src/lib/agent/AgentProductOverview.ts` | `getServicesOverview()`: limits, catalog availability, per-product today KPIs projected from the kiosk operation stream |
| BFFs | `/api/agent/accounts`, `/api/agent/cards` (+ `PATCH /api/agent/cards/[id]` transition map `verify|atIssuer|issued|delivered|cancel`), `/api/agent/fx`, `/api/agent/billers`, `/api/agent/services` — all `withAgentAuth` scoped (`payments:read`/`payments:write`) |
| Pages | `/agent/services` (hub), `/agent/accounts`, `/agent/cards`, `/agent/fx`, `/agent/bills`; `/agent/cash-in` + `/agent/cash-out` gained the **account rail** selector (bank rail vs opened KoriePay account) through `AgentOperationForm`; rail state forwarded by `AgentContext` → `POST /api/agent/operations` (`accountMode`) |
| Identity fix | Onboarding now stores the **canonical phone** (whitespace stripped); account-opening and card-applicant lookups compare normalized forms on read as well |

Two defects found during live testing and fixed before this evidence was captured:

1. **Biller fee split** (`LEDGER_INVALID_AMOUNT: −1000 minor`) — see table above.
2. **Spaced-phone mismatch** — `onboardCustomer` stored `+234 902 111 2233` while service engines compared against `+2349021112233`; canonicalized at write + tolerant at read.

---

## 2. Live verification run (prod build, clean seeded stores)

Bearer `kp_test_cdb3db2b9b22a98c9c1b` (documented sandbox credential, single source in `customerPortalClient`).

### A. Onboarding + account opening (pillar: customer account opening)
| Step | Call | Engine result |
|---|---|---|
| Onboard | `POST /api/agent/customers/onboard` — Chiamaka Okafor, `+234 902 111 2233` | `cust-ng-5807` · CUST-NG-36287 · phone stored **canonical** `+2349021112233` · TIER_1 |
| Products | `GET /api/agent/accounts` | KORIE_WALLET_NGN_BASIC (floor TIER_1) · KORIE_WALLET_NGN_TIER2 (floor TIER_2) |
| Open | `POST /api/agent/accounts` (BASIC, key `verify-open-basic-001`) | **0446460913** · "Chiamaka Okafor" · Providus Bank · NGN · OPEN (wallet subledger provisioned by `AccountLifecycleEngine`) |
| Duplicate (new key) | same customer + product | `ACCOUNT_ALREADY_EXISTS` — engine reject, no second account |
| Join view | `GET /api/agent/accounts` | 1 row: customer + `[0446460913]` |

### B. ATM/card lifecycle (pillar: ATM application) — no fake approvals
| Step | Call | Engine result |
|---|---|---|
| Apply | `POST /api/agent/cards` — crd-ngn-atm-01 on 0446460913 | `CARD-20260908-VERIFY` · APPLICATION_RECEIVED · fee ₦2,500 journaled (`ltx_1788830411459_0soee`) · commission ₦1,500 (60%) |
| Replay same key | — | `IDEMPOTENT_REPLAY` (same application returned) |
| `verify` | `PATCH /api/agent/cards/{id}` | KYC_VERIFIED (history grows, still **no** card ref) |
| `atIssuer` | PATCH | AT_ISSUER |
| `issued` | PATCH | ISSUED — **masked ref appears only now**: `KORIE••••6077` |
| `delivered` | PATCH | DELIVERED (masked ref persists) |
| Illegal event | PATCH `issued` after DELIVERED | `INVALID_TRANSITION` — Cannot move application from delivered to issued |

### C. BDC/FX corridor desk (pillar: BDC conversion)
| Step | Call | Engine result |
|---|---|---|
| Desk | `GET /api/agent/fx` | NGN/XOF reference **0.392 XOF/₦** (SAFE) · quote 10,000 XOF: buy ₦2.6148/XOF (ref +250bps) → ₦26,148 · sell ₦2.5000/XOF (ref −200bps) → ₦25,000 · USD/NGN market 1,610 read-only |
| BUY 10,000 XOF | `POST /api/agent/fx` | `KP-AGT-FX-verify-fx-buy-001` · ₦26,148 charged · margin ₦638 → commissions payable · journal `ltx_1788830418709_0oygc` |
| SELL 5,000 XOF | `POST /api/agent/fx` | ₦12,500 paid from till · applied 2.5000 · journal `ltx_1788830418738_2snmm` |
| 500 XOF | POST | `BELOW_MINIMUM` — corridor desk minimum is 1,000 XOF |
| Replay buy key | POST | `IDEMPOTENT_REPLAY` |

### D. Bills & top-ups (pillar: bills)
| Step | Call | Engine result |
|---|---|---|
| DStv ₦3,500 | `POST /api/agent/billers` | `KP-AGT-BILL-verify-bill-dstv-0` · + ₦100 service charge · agent commission ₦60 (60%) · platform ₦40 (40%) · journal `ltx_1788830453225_0swox` |
| Replay same key | POST | `IDEMPOTENT_REPLAY` |

### E. Account rail on deposits/withdrawals (core rail — opened accounts = ledger of record)
| Step | Call | Engine result |
|---|---|---|
| Deposit | `POST /api/agent/operations` CASH_IN ₦25,000 · `accountMode:true` · 0446460913 | SUCCESSFUL · journal `ltx_1788830430754_8pe2e` — DR `acc_asset_agent_cash_ngn` / CR `acc_liab_customer_wallets_ngn` · wallet subledger +₦25,000 · till +₦25,000 |
| Withdrawal | CASH_OUT ₦10,000 · account rail | SUCCESSFUL · journal `ltx_1788830430785_8ivy9` — CR cash / DR customer wallets · wallet −₦10,000 |
| Till guard | CASH_OUT ₦50,000 | `INSUFFICIENT_TILL_CASH` — till ₦31,148 cannot cover |
| Wallet guard | CASH_OUT ₦20,000 (till ₦31,148 was sufficient) | `INSUFFICIENT_ACCOUNT_BALANCE` — account balance ₦15,000 cannot cover ₦20,000 |

The guards prove the checks are layered and real: till cash is verified for every cash-out and the **customer wallet subledger** is verified whenever the rail is the customer's KoriePay account.

### F. Services hub (live aggregation, after E/D/B/A)
`GET /api/agent/services` → limits (single-op ₦200,000 · bill range ₦50–200,000 · fx single ₦200,000/daily ₦1,000,000 · card fee max ₦5,000); catalogs 12 billers / 6 categories / 2 card products / 2 openable accounts / corridors; **today** KPIs from the actual run above:

| Product | count | volume |
|---|---|---|
| CASH_IN | 1 | ₦25,000 |
| CASH_OUT | 1 | ₦10,000 |
| ACCOUNT_OPENING | 1 | ₦0 |
| BILL_PAYMENT | 1 | ₦3,500 |
| CARD_APPLICATION | 1 | ₦2,500 |
| FX_CONVERSION | 2 | ₦38,648 |

### G. Page smoke (prod build, all HTTP 200)
`/agent/services` `/agent/bills` `/agent/cards` `/agent/fx` `/agent/accounts` `/agent/cash-in` `/agent/cash-out` — plus `tsc --noEmit` clean, `next lint` clean, `next build` clean before the run.

---

## 3. Honesty notes / bounds of this pass
- Runtime state lives in `/tmp/korie-*.json` stores (env-overridable), seeded fresh per sandbox; figures above describe the verification run, not production data. Stores are never committed.
- XOF legs settle on the treasury corridor float — the till journals **naira legs only**; no XOF cash is held at the till (documented seam, echoed in the UI).
- USD/NGN is a read-only market card — no USD till vault, so no USD trade is offered.
- Card references stay masked (`KORIE••••6077`) on every surface; issuance only ever advances through explicit lifecycle events.
- Biller payments remit on an accrual model (`acc_liab_biller_settlements_ngn` payable) — outbound remittance rails are outside this pass.
- Sandbox bearer is the documented `kp_test_…` demo credential — never a production secret.
