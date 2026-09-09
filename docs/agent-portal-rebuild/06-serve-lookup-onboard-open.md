# Agent portal — serve-screen balance lookup & one-tap onboard + open

Date: 2026-09-09 · Branch: `feature/compliance-portal-demo-rebuild`
Scope: The two queued review items — (1) customer balance lookup on the serve screens so agents can pre-check a payout against the wallet before submitting, and (2) collapsing "onboard on Customers → open on Accounts" into a single engine intent.

---

## 1. What changed

| Surface | Change |
|---|---|
| `AccountServiceEngine` | `walletBalanceFor(customerId)` — live NGN wallet available balance from the customer wallet subledger (display truth; ledger journals remain the double-entry record). `openAccount` now accepts optional `fullName`/`email`: when the phone is not yet onboarded at this terminal the engine onboards the walk-in first (customer master via `CustomerLifecycleEngine` + terminal registry via `AgentKioskStore`, mirroring the Customers-page sequence exactly) and then opens the account — **one engine intent, one idempotency key**. Master-registry phone dedupe prevents duplicate masters on retry; success now carries a code (`ONBOARDED_AND_OPENED` / `ACCOUNT_OPENED`). |
| `GET /api/agent/accounts` | Each opened NGN account row now carries `availableBalance` (whole ₦, wallet subledger at request time). Scoped: only customers onboarded at this terminal are listed — no arbitrary balance probing. |
| `POST /api/agent/accounts` | Forwards `fullName`/`email`; returns `{ account, customer, onboarded, code }` so the UI can confirm the composite result. |
| `AgentOperationForm` (cash-in & cash-out serve screens) | Selecting an opened KoriePay account now shows a **live balance note**: available-to-debit balance, covers/short verdict against the entered amount for cash-out ("Wallet short by ₦X — the engine will decline"), and projected balance-after-deposit for cash-in. A "Refresh" control re-reads the engine snapshot (balances move with every op; the list is re-fetched on every rail toggle). |
| `/agent/accounts` | Opened-account rows show each account's available balance (respects the global balance-hide). The modal gained a customer-type segment: **Already onboarded** (picker) or **New walk-in (onboard & open)** with name/phone/email + product — one submit does everything. Empty state and header CTA launch the new-walk-in mode when no customers exist at the terminal yet. |

### Honesty notes
- The balance is a wallet-subledger snapshot (display truth) refreshed from the engine on demand; the *authoritative* guard remains server-side (`INSUFFICIENT_ACCOUNT_BALANCE` in `AgentPortalEngine`) — the UI note never authorizes a payout by itself.
- XOF accounts or other banks' accounts cannot be probed: the lookup is restricted to NGN KoriePay accounts opened at this terminal (registry-scoped).
- The composite uses one idempotency key covering onboard + open; replays return the original operation with no duplicate master, registry row or journal.

---

## 2. Live verification (prod build, seeded `/tmp` stores, sandbox bearer)

### One-tap onboard + open
| Step | Call | Engine result |
|---|---|---|
| New walk-in | `POST /api/agent/accounts` — Tunde Bakare `+234 905 555 6677`, BASIC wallet, key `verify-onetap-004` | `code: ONBOARDED_AND_OPENED` · `onboarded: true` · kyc TIER_1 · account **0357731930** minted (Providus) |
| Kiosk stream | `GET /api/agent/portal` | `ACCOUNT_OPENING · "Account opened — KoriePay Personal Digital Wallet (NGN)" · Tunde Bakare · serviceRef: 0357731930` |
| Replay same key | POST same payload | `IDEMPOTENT_REPLAY` · `onboarded: false` — no double onboarding |
| Duplicate, new key | same customer + product | `ACCOUNT_ALREADY_EXISTS` (Customer already holds … account 0112701345) |
| No `fullName`, unknown phone | POST | `CUSTOMER_NOT_ONBOARDED` — "…use the one-tap Onboard & open flow…" |
| Invalid phone | POST with `123` | `PHONE_REQUIRED` |

Earlier one-tap walk-ins in the same run (Adaeze Nwosu → 0204728080, Ngozi Eze → 0112701345) all appear as separate ACCOUNT_OPENING stream rows with `serviceRef` = account number — each composite posts exactly one operation.

### Serve-screen balance lookup
| Step | Call | Result |
|---|---|---|
| List | `GET /api/agent/accounts` | rows carry `availableBalance: 0` for freshly opened accounts (NGN) |
| Deposit on account rail | `POST /api/agent/operations` CASH_IN ₦12,500 accountMode, Adaeze 0204728080 | SUCCESSFUL · journal `ltx_1788973824467_7t7b1` · till + cash ↔ customer wallet liability |
| Re-list | `GET /api/agent/accounts` | Adaeze Nwosu balance now **₦12,500** — the projected field tracks real wallet movement |

The serve form consumes that same field: cash-out against ₦12,500 shows "Wallet covers ₦Y" up to ₦12,500 and "Wallet short by ₦Z — the engine will decline" beyond it; cash-in shows the projected after-deposit balance. Pages smoke-tested: `/agent/accounts`, `/agent/cash-in`, `/agent/cash-out`, `/agent/services` all HTTP 200 on the prod build; `tsc`, `next lint` and `next build` clean.

---

## 3. Non-goals / bounds
- No new balance-enquiry *fee product* was added (would need engine fee config + journal semantics); the lookup is an internal serve-screen tool.
- Balance shown is NGN-wallet display truth; ledger remains the journal of record (chart accounts + double-entry), unchanged.
- XOF corridor accounts, third-party NUBANs and other terminals' customers are out of lookup scope by design.
