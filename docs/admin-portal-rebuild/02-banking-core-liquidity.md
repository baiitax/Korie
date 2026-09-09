# 02 — Bank Core & Liquidity (the transactable bank)

Status: **SHIPPED + LIVE** (prod build on :3000) · Date: 2026-09-09 · Branch: `feature/compliance-portal-demo-rebuild`

## What was asked

> “Let's build a fully functional bank that can be used to transact, whose API will be connected and serve as liquidity.”

## Design decisions (engine truth, no fiction)

The platform already had banking engines (ledger, wallets, customer accounts). The Bank Core **composes**
those engines instead of cloning them:

| Concern | Engine |
|---|---|
| Chart of accounts + immutable double-entry journals | `src/lib/services/LedgerService` (kobo minor units) |
| Customer wallet subledgers | `src/lib/financial/SubledgerEngine` (2010-NGN / 2020-XOF) |
| Real NUBAN minting & account lifecycle | `src/lib/customer/AccountLifecycleEngine` (`KORIE_WALLET_NGN_BASIC`, Providus 058) |
| Customer records | `src/lib/customer/CustomerLifecycleEngine` |
| **Liquidity rail decision** (which partner bank carries the float) | read **live** from the admin Configuration Hub (`BANK_NODE` connectors) |
| New settlement nostros (chart accounts) | `acc_asset_bank_settlement_ngn` (1010), `acc_asset_bank_settlement_xof` (1020) |

New files:
- `src/lib/bank/BankCoreEngine.ts` — account open (idempotent), inbound credit, internal transfer, NIP outbound, nostro positions, gateway-mode resolver.
- `src/app/api/bank/v1/accounts` · `funding` · `transfers` · `liquidity` — versioned Bank API (`/api/bank/v1/*`).
- `src/lib/bank/bankApiGuard.ts` — bearer guard (`kp_test_…` / `kp_live_…` demo convention).
- `src/app/admin/bank/page.tsx` — admin **Bank Core & Liquidity** console (nav: FINANCIAL & TREASURY → Bank Core & Liquidity).

### How the API “serves as liquidity”

`BankCoreEngine.gatewayMode()` resolves **BANK_NODE connectors in the admin config hub** each request:

- no connector / no base URL → `SIMULATED` rail (honest sandbox float; demo money is clearly demo);
- connector **CONNECTED + PRODUCTION + secret configured** → `LIVE` rail note naming the provider and endpoint.

There is no silent fake: the mode badge is rendered in the UI and stamped on every bank transaction row.
XOF liquidity sits at the Coris node (`coris_ne`, settlement `NE5400240199`, 150,000,000 XOF opening float) ready for
the Coris connector; live in-rail testing this interval was NGN.

### Money movement (all journaled — verified below)

| Operation | GL posting (kobo) | Wallet subledger | Nostro |
|---|---|---|---|
| Inbound credit (funding) | DR `1010 bank settlement` / CR `2010 wallets` | customer +amount | float +amount |
| Internal transfer | DR `2010` sender / CR `2010` receiver | sender −, receiver + | no movement |
| NIP outbound | DR `2010` (amount+fee) / CR `1010` amount / CR `acc_rev_tx_fees_ngn` fee | sender −(amount+fee) | float −amount |

Flat ₦10 NIP fee (`BANK_NIP_FEE_NGN`) accrues to fee-revenue (existing chart account).

## Live verification (prod :3000, bearer `kp_test_cdb3db2b9b22a98c9c1b`)

```
L0 liquidity:  rail SIMULATED · nostro NGN ₦25,000,000 / XOF 150,000,000
O1 open Amina Lawal     → NUBAN 0106857773 (HTTP 201)
O2 open Yakubu Danladi  → NUBAN 0484644865 (HTTP 201)
O3 reopen Amina         → HTTP 200, created:false, SAME NUBAN 0106857773 (idempotent)
F1 fund Amina +₦50,000  → BK-CREDIT-MTUGLM0X-3 · journal ltx_1788980165314_q26rj
T1 internal A→B ₦12,000 → journal ltx_1788980165336_5gr2y
T2 NIP out A→Zenith ₦10,000 → BK-NIP-MTUGLM2E-5 · fee ₦10 · journal ltx_1788980165366_oz137
E1 NIP out ₦9,000,000   → INSUFFICIENT_BALANCE (honest rejection, no fake approval)
R1 balances  A: ₦27,990 (=50,000−12,000−10,000−10) · B: ₦12,000
R2 nostro NGN ₦25,040,000 (=25,000,000+50,000−10,000; internal transfer moves nothing) ✓
```

Journal audit from the ledger store (minor units):

| Reference | Entries |
|---|---|
| BK-CREDIT-MTUGLM0X-3 | DR 5,000,000 → 1010-BANK-SETTLE-NGN · CR 5,000,000 → 2010 wallets |
| BK-P2P-MTUGLM1K-4 | DR 1,200,000 → 2010 · CR 1,200,000 → 2010 (net zero, no nostro) |
| BK-NIP-MTUGLM2E-5 | DR 1,001,000 → 2010 · CR 1,000,000 → 1010 · CR 1,000 → fee revenue |

Page smoke: `/admin/bank` 200 (Bank Core & Liquidity console), `/admin/settings` 200. Bank API 401 without bearer.
No raw secrets anywhere in `/tmp` stores.

## Honest boundaries

- LIVE rail activation requires the operator to configure a real bank node and supply credentials — sandbox
  provably shows `SIMULATED` until then; probe failures are real probe failures, never fabricated CONNECTED states.
- XOF: node + account surface exist; Coris connectivity is configuration-forward (see docs/03).
- Runtime state files: `/tmp/korie-bank-store.json` (env `BANK_CORE_STORE_PATH`) — demo runtime only, never committed.
