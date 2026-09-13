# 12 — Server sessions & subject claims: batch 3

Status: **DELIVERED + LIVE-PROBED** (prod build on :3000) · Date: 2026-09-13 · Branch: `feature/compliance-portal-demo-rebuild`

## Method

Batch-3 backlog from doc 11 (session layer, scope split, seed migration). The assessment's
"any ≥6-digit OTP + unregistered `kp_sess_*`" finding is closed with a real registry, not a
Supabase dependency the sandbox cannot satisfy. Every claim carries a file:line or a live
transcript.

## What changed

### 1 · SessionEngine: OTP challenges + registered sessions

`src/lib/auth/SessionEngine.ts` (new), file-backed at `/tmp/korie-sessions.json`, mirroring the
credential registry's discipline (salted SHA-256, timing-safe compare, fail-closed codes):

- `requestOtp`: crypto-random 6-digit, 10-min TTL, 60s resend cooldown (`OTP_RESEND_TOO_SOON`),
  ≤5 issues/hour (`OTP_RATE_LIMITED`). No SMS/email provider exists, so `dispatched:false`,
  `channel:'NONE_CONFIGURED'` — stated, not faked.
- `verifyOtp`: 5 attempts then `OTP_LOCKED` (423); single-use burn; expiry 410. Minted sessions
  are `kp_sess_` + 36 hex, 12h TTL, bound to a resolved customer/agent subject; unregistered
  identifiers get `NO_SUCH_SUBJECT` (404) after a correct code.
- `verifySession`: `INVALID_SESSION` / `SESSION_REVOKED` / `SESSION_EXPIRED` /
  `SESSION_SUBJECT_GONE` (subject re-checked per call — restart-wiped in-memory records fail
  closed). `revokeSession` is idempotent logout.
- Test-code reveal (`testCode`, labeled test mode): non-production by default;
  **production default never reveals** — prod builds need explicit `KORIE_ALLOW_OTP_TEST=true`
  (this bit the first battery run: `next start` sets `NODE_ENV=production`, correctly hiding
  codes until the hatch was opened). `KORIE_OTP_TEST_MODE=false` kills reveal everywhere.

### 2 · Sessions authenticate the API with subject claims

- `authMiddleware`: `kp_sess_*` verifies against the session registry (scope-checked with the
  shared matcher; old unregistered session strings 401 `INVALID_SESSION`). Context carries the
  new typed `customerId`/`agentId` claims (`src/types/apiGateway.ts`) — the exact extension
  point the portal scope resolvers already read first. Session grant (`SESSION_SCOPES`):
  payments r/w, transfers write, wallets read, fx read, kyc verify, agency write, bills vend.
  No admin, bank, developer, or merchant scopes.

### 3 · The theatrical auth routes are real or honest

- `resend-otp` → real issuance; `verify-otp` → real verification + session mint.
- `GET /api/auth/session` → live whoami (the hardcoded always-valid `usr_default_01` is gone).
- `logout` → server-side revoke (best-effort, idempotent) + cookie clears.
- `mfa` → 501 `MFA_NOT_ENROLLED` (was: any 6 digits → AAL2). `reset-password` → 501
  `PASSWORD_RESET_UNAVAILABLE` (was: claimed reset with no code check and no store).
  Neither route has in-tree callers; the login UI drives client-side `AuthService`, untouched.
- `registerCustomer` now persists a real engine row (was vapor — the user evaporated, so OTP
  had no subject to bind). Return contract unchanged (`success`, `requiresOtp`).

### 4 · Scope split + seed migration (doc-11 items 2–3)

- Admin seed dropped `developer:read/write` (least privilege: the admin console calls
  `/api/admin/*` only). `seedScopesFor(id)` is now the single source for seed grants.
- `hydrate` union-merges canonical seed scopes into persisted seed rows (additive only).
  Limitation, stated: narrowing (like this strip) does not propagate to old stores — stale
  grants persist until the store is wiped or the key revoked. Acceptable for `/tmp`-ephemeral
  state; a production migration would version-stamp grants.

## Live transcripts (prod build, :3000, `KORIE_ALLOW_OTP_TEST=true`)

| # | Call | Result |
|---|---|---|
| S1–S2 | OTP for Ibrahim; immediate re-request | `dispatched:false`, masked `+234 ••• ••• 7766`, `testCode` labeled; 429 `OTP_RESEND_TOO_SOON` |
| S3–S5 | wrong code; correct code; reuse | 401 `OTP_MISMATCH` (4 left); 200 session `CUSTOMER/cust-ng-001-ibrahim`; 404 `OTP_NOT_REQUESTED` |
| S6–S8 | session whoami; customer portal; admin route | 200; 200; 403 (no admin scope) |
| S9–S10 | logout → reuse; self-minted `kp_sess_` | `sessionRevoked:true` → 401 `SESSION_REVOKED`; 401 `INVALID_SESSION` |
| S11 | agent OTP → agent portal | `AGENT/agt-ng-001` → 200 |
| S12 | correct code, unregistered identifier | 404 `NO_SUCH_SUBJECT` |
| S13 | register → OTP → session | `cust-ng-7748` persisted and bound |
| S14 | mfa / reset-password | 501 / 501 |
| S15 | admin seed on developers; dev seed | 403 (split proven); 200 |
| S16 | store narrowed to 14 scopes → reboot → whoami | 16 scopes, `bank:*` restored (merge proven) |
| S17 | 6 wrong codes in a row | 5× `OTP_MISMATCH`, then `OTP_LOCKED` |
| claim | Amara's session on `/api/customer/portal` | resolves **Amara Diallo (NE)** — per-subject claims, not the Ibrahim shim |

Gates: `tsc --noEmit` clean, `next build` clean. No committed secrets; runtime residue in
`/tmp` stores only.

## Pre-existing, untouched, on the record

- `tests/auth_suite.test.ts` predates the `DEMO_PASSWORD` check (TEST 6 logs in with
  `'password'` and expects success — red against current code), has no `npm test` runner, and
  cannot execute standalone (TS + `@/` aliases, no tsx/jest installed). Console-only, not a
  gate. Left as found.
- Supabase remains unwired; sessions are engine-backed, which is the honest sandbox posture.
- UI wiring (login/register pages driving OTP→session, portal shells sending session bearers)
  is future work — the API path is complete and battery-proven.
