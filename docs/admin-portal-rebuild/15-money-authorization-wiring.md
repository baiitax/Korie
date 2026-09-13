# Batch 6 — Money authorization wiring (gateway out of orphanage)

The assessment's core safety finding is now closed: `AccountAuthorizationGateway`
(eight checks: customer status, account status, product active, KYC-tier fit,
risk ceiling, channel allow-list, device posture, balance, tiered single/daily
limits) had **zero callers**. Limits existed as configuration with no
enforcement. Both money-moving services are now wired through it.

## What changed (3 files)

- `src/lib/authorization/AccountAuthorizationGateway.ts` — the gateway read the
  product's `minKycTier` / `maxRiskScore` into scope but never enforced them.
  Step 3 now DECLINEs `KYC_TIER_INSUFFICIENT` (ordered TIER_0..TIER_3 compare)
  and `RISK_SCORE_EXCEEDED` (customer score vs product ceiling).
- `src/lib/bank/BankCoreEngine.ts` — `internalTransfer` (channel
  `VIRTUAL_ACCOUNT`) and `nipOut` (channel `NIP`, limit amount = amount + fee)
  call the gateway **inside the sender lock**, after idempotency replay, before
  the balance check. Declines return `AUTHORIZATION_DECLINED` with the
  gateway's reason codes. Successful sends record consumption via
  `AccountLimitEngine.recordTransactionConsumption` before the lock releases,
  so check + debit + record are atomic per sender.
- `src/lib/services/TransactionService.ts` — new `authorizeCustomerSend`
  helper; `executeNipOutward` and `executeCrossBorderTransfer` authorize up
  front (minor→major conversion for the limit engine) and record consumption
  after the subledger debit. When there is no `sourceCustomerId` (the v1
  integrator path, which debits no customer wallet) the helper returns null
  and the send proceeds — the gateway evaluates a *customer subject*, and that
  path has none. Debatable product decision, documented here, not hidden.

`creditInbound` (funding) is deliberately restriction-only: inbound credits to
a pending customer must still land (real banks park them in suspense), so the
status/limit gates apply to sends, never to funding. Proven by A0/A1 below.

## Battery (19/19, ` /tmp/authz_battery.sh`, fresh process, prod build :3000)

Subject: seeded Ibrahim (`0123456789`, ACTIVE, TIER_2, risk 12.5) on product
`KORIE_WALLET_NGN_TIER2` (single ₦200,000 / daily ₦1,000,000, NIP + VA open).
Counter-subject: a freshly opened applicant (`APPLICATION_STARTED`).

| # | Probe | Result |
|---|-------|--------|
| A0 | fund the pending applicant ₦10,000 | success (inbound unrestricted) |
| A1 | applicant sends ₦1,000 | `AUTHORIZATION_DECLINED: CUSTOMER_STATUS_LOCKED: APPLICATION_STARTED` |
| A5 | portal transfer ₦5,000 as Ibrahim (real OTP session) | `SUCCESSFUL`, ₦50 fee; ₦200,001 → `SINGLE_LIMIT_EXCEEDED` |
| A2 | INTERNAL ₦50,000 Ibrahim→applicant | success, journal `ltx_…_jbmbj` |
| A3 | INTERNAL ₦200,001 | `AUTHORIZATION_DECLINED: SINGLE_LIMIT_EXCEEDED` |
| A4 | 4×₦190,000 + ₦185,000 (daily total exactly ₦1,000,000 incl. A5+A2) | all success; next ₦1,000 → `DAILY_LIMIT_EXCEEDED … would reach 1001000` |
| A6 | v1 NIP outward, no customer context | dispatched `SUCCESSFUL` (no regression) |
| A7 | repeat A2 key+body | `replayed:true`, identical journal (batch-5 intact) |

The A4 arithmetic is the cross-path proof: the cap math only lands exactly on
₦1,000,000 if the portal-path ₦5,000 (TransactionService) and the bank-path
sends share one consumption ledger — they do.

## Stated edges

- Daily consumption is **in-memory**: a restart resets counters while wallet
  balances (persisted subledger) survive. Proven incidentally mid-battery
  (run 2 inherited run 1's balances but not its consumption). Persisting the
  limit store is future work, same class as batch-5's in-process locks.
- TransactionService authorizes before the provider flight and records after
  success without holding a lock, so two racing sends on one account could
  jointly overrun the daily cap. Sequential-per-user portal traffic cannot hit
  this; the bank paths (which carry the concurrency battery) are lock-safe. A
  reserve/refund pattern would close it if integrator concurrency requires it.
- The v1 integrator path moves value with no customer subject and therefore
  no policy evaluation — needs a product decision (attribute to an integrator
  wallet subject, or keep exempt), out of this batch's scope.
