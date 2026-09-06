# 12 — Receipt labels, pinned money-path contracts, CI

Follow-up to `11-balance-truth-adashi-i18n.md`. One more live defect found and
fixed, the money-path and i18n contracts pinned in a runnable test suite, and
the repo's first CI.

---

## Defect 4 — Every receipt rendered raw i18n keys

**Evidence (live deployment, Playwright, EN):** completing a transfer through
the real UI and opening the receipt showed

```
RECEIPT.RECEIPTDOCUMENTTYPE · KP-2026-TX-…
RECEIPT.TITLE / RECEIPT.STATUSSUCCESSFUL
receipt.to / receipt.from / receipt.exchangeRate
receipt.transactionReference / receipt.date / receipt.serviceFee
```

**Root cause:** `TransactionReceiptModal` resolves its labels through
`translateNamespace(lang, "receipt")`, which flattens whatever
`getNestedValue()` returns for the path `"receipt"`. But `getNestedValue`
returned `typeof current === "string" ? current : undefined` — for a namespace
**object** that is always `undefined`, so `translateNamespace` produced an
empty map in every language, and both the modal (`labelMap`) and
`ReceiptDocument` (`L(key) = localeLabels[key] ?? key`) fell back to raw keys.
This was true since the receipt shipped; no test or sweep covered the modal.

**Fix:** the dot-notation walk is split into `getNestedRaw` (returns whatever
lives at the path — string or namespace object) and `getNestedValue`
(string-only view for `translate()`). `translateNamespace` now uses the raw
accessor for both the selected language and the English fallback map.

**Verified after (local build):** the same UI flow renders
`TRANSACTION RECEIPT · KP-…`, `OFFICIAL TRANSACTION RECEIPT`, `To`, `From`,
`Exchange rate`, `Transaction Reference`, `Date`, `Service Fee / VAT`.

## Pinned contracts (vitest, `npm test`)

- `tests/money-paths.test.ts` — the inclusive-fee model end to end:
  cross-border fee = ⌊amount × 0.5%⌋, recipient gets (amount − fee) × rate,
  **wallet debit exactly `amount`**, `totalAmount == amount == actual debit`,
  NIP flat ₦50 fee inside the amount, ownership tagging, minor-unit rounding
  (NGN 2dp, XOF whole francs).
- `tests/i18n.test.ts` — both placeholder brace styles interpolate across
  every param-bearing EN key; EN→FR/HA fallbacks; the receipt namespace map
  resolves in all three languages.
- The legacy console suite (`tests/auth_suite.test.ts`) is excluded from
  vitest (it calls `process.exit`) and remains runnable via `node`.

## Repo hygiene

- `.env.example` — every environment variable the code reads (Supabase public
  + service pairs, sandbox tokens, provider credentials, support contact
  points), with notes on which are server-only.
- `.github/workflows/ci.yml` — on push/PR to main: `npm ci`, typecheck, lint,
  i18n parity, `npm test`, production build.
- Next.js 14.2.15 → **14.2.35** (latest 14.2.x security patch line; closes
  the middleware-bypass advisory class). Build clean at 425/425 routes.
  Remaining `npm audit` highs are self-hosted-image/cache and build-time-only
  (glob/postcss) advisories whose real fixes land in the Next 15/16 migration
  — deliberately not attempted here while feature work is in flight.

## Gates at commit time

`tsc --noEmit` ✓ · lint (pre-existing warnings only) ✓ · i18n parity 2,681
keys × EN/FR/HA ✓ · `npm test` 20/20 ✓ · `next build` (14.2.35) 425/425 ✓ ·
`scripts/verify-fixes.mjs` 8/8 ✓ · receipt labels verified in Chromium ✓ ·
`scripts/ux-sweep.mjs` 0 failures (10 widths × 6 routes) ✓
