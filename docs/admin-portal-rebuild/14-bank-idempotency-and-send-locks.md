# 14 — Bank idempotency & sender locks: batch 5

Status: **DELIVERED + LIVE-PROBED** (prod build on :3000) · Date: 2026-09-13 · Branch: `feature/compliance-portal-demo-rebuild`

## Method

Post-auth remediation turns to money correctness: the assessment's double-submit and
overdraw findings. The transfers route *comment* claimed idempotency keys were honoured;
the engine contained zero idempotency code and the routes never read the header. Both the
double-post and the check-then-act race are now closed in `BankCoreEngine`, battery-proven
below.

## What changed

### 1 · Real idempotency on all three money mutations

`src/lib/bank/BankCoreEngine.ts`: executed keys persist in file-backed `state.idempotency`
(24h TTL, pruned on access) as `{fingerprint, journalId, transaction}`.

- Same key + identical params → recorded journal replayed with `replayed: true`.
- Same key + different params → 422 `IDEMPOTENCY_KEY_REUSED` (fail loud, never re-execute).
- Present-but-short key (<8 chars) → 400 `IDEMPOTENCY_KEY_TOO_SHORT`. Absent key → executes
  normally (backwards compatible with callers that never send keys).
- Fingerprints are built from RAW request params and checked BEFORE account validation, so a
  retried request replays its recorded outcome even after a restart wiped the in-memory
  account rows — the only honest answer to "did my first attempt land?" Fresh keys on gone
  accounts still fail `ACCOUNT_NOT_FOUND`; nothing executes without a resolved account.

### 2 · Per-sender locks close the TOCTOU overdraw

`withLock(wallet:<senderCustomerId>)` (promise-chain mutex, in-process) wraps the
balance-check → journal-post → wallet-move critical section in `internalTransfer` and
`nipOut`, plus the post path in `creditInbound`. The idempotency record is written inside
the same lock after a second authoritative check, so concurrent same-key retries serialize
instead of double-posting. Stated limit: in-process only — multi-instance needs a
distributed lock.

### 3 · Route plumbing

`transfers` (INTERNAL + NIP_OUT) and `funding` read the `idempotency-key` header, pass it
through, map `IDEMPOTENCY_KEY_REUSED` → 422, and surface `replayed`. The route comment now
describes the real behavior.

## Live transcripts (prod build, :3000)

| # | Call | Result |
|---|---|---|
| I1 | fund ₦20,000 key `FUNDK001` ×2 | same journal `ltx_…_v16i1`, `replayed:true`; balance ₦20,000 (credited once) |
| I2–I3 | same key, ₦1; 3-char key | 422 `IDEMPOTENCY_KEY_REUSED`; 400 `IDEMPOTENCY_KEY_TOO_SHORT` |
| I4 | INTERNAL ₦5,000 key `TXK00002` ×2 | same journal `ltx_…_d9iyf`, `replayed:true`; 15,000 / 5,000 (moved once) |
| I5 | 10 parallel INTERNAL ₦3,000 from ₦15,000 (distinct keys) | exactly 5× OK + 5× `INSUFFICIENT_BALANCE`; final ₦0, never negative |
| I6 | NIP_OUT key `NIPK0003` ×2 | same journal `ltx_…_6w9es`, `replayed:true` |
| I7 | restart (account rows wiped) → replay `FUNDK001`, `TXK00002`; fresh key | identical journals + `replayed:true` ×2; fresh key `ACCOUNT_NOT_FOUND` |

Gates: `tsc --noEmit` clean, `next build` clean. No committed secrets; runtime residue in
`/tmp` stores only.

## Stated edges

1. Keys recorded before the fingerprint change resolve identically for number-based callers
   (all current callers); a hypothetical id-based caller retrying a pre-change key would get
   422 instead of a replay — loud, never a double-post. Fresh keys are fully consistent.
2. 24h TTL: retries after expiry execute anew (standard idempotency-window semantics).
3. Locks are per-process; the engine comment says so where the next scaler will look.
