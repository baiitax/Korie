# 11 — Balance truth, Adashi visibility, i18n placeholder leaks

Follow-up audit to `10-ux-reconstruction.md`. Three defects found by driving the
live deployment in a real browser (Playwright) and reading the engine, all fixed
in this pass.

---

## Defect 1 — The fee model contradicted the balance (money display truth)

**Evidence (measured, local build + live deployment):**

- `POST /api/customer/portal/transfer` of NGN 50,000 cross-border returned
  `fee: 250` and `totalAmount: 50,250`.
- The wallet subledger was debited **exactly 50,000** (`SubledgerEngine` before:
  1,250,000 → after: 1,200,000).
- The send-money review screen showed "Total Debit ₦50,250"
  (`totalDebit = amount + fee`).
- The GL entries are balanced with an INCLUSIVE fee: wallet DEBIT `amount`;
  settlement CREDIT `netAmount`; revenue CREDIT `fee`. The provider is
  dispatched `netAmount` (domestic NIP) / `netAmount × rate` (cross-border).

So every surface that said "you pay amount + fee" was asserting a debit that
never happens. The engine is internally consistent (inclusive fee); the display
layers were written to an additive model. The customer-visible symptom: the
review screen and receipt promise one number, the balance moves another.

**Fix (inclusive everywhere — it matches the actual money movement):**

- `CustomerTransactionQuery.toCustomerTransaction`: `totalAmount: amount`
  (was `amount + fee`).
- `send-money/page.tsx`: `totalDebit = parsesAmount` (was `+ fee`).
- Fee rows relabelled `transfers.transferFee` → new `transfers.feeIncluded`
  ("Transfer Fee (included)" / EN+FR+HA) so the inclusive model is explicit.
- `TransactionService` step-4 comment corrected: the debit is the full source
  amount; the fee is taken from within it, never added on top.

Not changed: GL entries, provider dispatch amounts, subledger debit — they were
already consistent and balanced.

## Defect 2 — 21 locale strings leaked raw `{param}` placeholders on screen

`translate()` interpolated only `{{param}}`, but 7 keys × 3 languages are
authored with single braces. Confirmed rendering on the live deployment:
FX page showed "Rate expires in **{secs}s**".

Affected keys: `public.footer.copyright {year}`, `public.hero.simulator
.approxPerYear {annual}`, `fx.rateExpiresIn {secs}`, `payments.confirmedDesc
{amount} {merchant}`, `support.lastReplyBy {name}`, `adashi.contributionDue
{cycle}`, `adashi.dueOn {day}`.

**Fix:** `src/locales/index.ts` — the interpolation loop now replaces
`{{k}}` first, then `{k}`. No dictionary edits required; both authoring
styles keep working.

## Defect 3 — Adashi (a live product) was unreachable by navigation

`/customer/adashi` is a complete surface (circles, rotation sequence,
contribution obligations, payout state) — 2 migrations, 14 design docs.
It appeared in no nav array, no services grid, no quick action. The dashboard
services section offered four COMING SOON pills and zero live services.

**Fix:**

- `CustomerShell` `serviceNav`: Adashi listed first (it is live; the entries
  after it are COMING SOON).
- `EverydayServices`: full-width Adashi tile with an "Active" badge
  (`customer.adashi.hubActive`, EN+FR+HA) above the coming-soon pills — the one
  real service reads as real, not as a fifth greyed-out pill. The sidebar nav
  gains `nav.adashi` (EN+FR+HA), listed first in the services group.

## Verified after the fix (local build, headless Chromium)

- `npm run i18n:check` → 1352 keys, FR+HA parity OK (2 new keys × 3 languages).
- `npx tsc --noEmit` and `next build` clean.
- `/customer/fx` renders "Rate expires in 42s" (interpolated, counted down).
- `/customer` shows the Adashi tile with "Active" badge; sidebar lists Adashi.
- Send-money review: Total Debit equals the entered amount; fee row labelled
  "(included)"; wallet balance after transfer drops exactly the displayed total.

## Still open (documented, not fixed here — needs a running database)

The engines are in-memory singletons. On serverless (Vercel) each function
instance holds its own module state: a transfer executes on one instance and a
later read can hit a cold instance that has never seen it. Reproduced on the
live deployment: after a SUCCESSFUL API transfer, a fresh browser session
showed the seeded balance and "No transactions yet". This is the first item of
`BANKING_INTEGRATION_PLAN.md` (Supabase-backed reads/writes) and cannot be
honestly fixed without the running database.
