# 13 — Session UI wiring: batch 4

Status: **DELIVERED + LIVE-PROBED** (prod build on :3000) · Date: 2026-09-13 · Branch: `feature/compliance-portal-demo-rebuild`

## Method

Doc-12 future work, item 1: the session API was complete but no UI drove it. This batch wires
the browser flow onto the real endpoints and removes the last client-side auth theater. Server
paths are battery-proven below; the React flow replays them exactly (same endpoints, same
payloads) and all pages render — click-through is manually verifiable on the running build.

## What changed

### 1 · AuthContext drives the real session API

`src/components/auth/AuthContext.tsx` rewritten around server calls:

- `register` → `POST /api/auth/register` (was: client-side service call whose engine row
  evaporated with the page, stranding the OTP step with no subject). Sets the pending
  identifier + masked destination, routes to `/otp`.
- `requestOtp` (new) → `POST /api/auth/resend-otp`; surfaces throttle messages and the
  test-mode code.
- `verifyOtp` → `POST /api/auth/verify-otp` (was: `code === "123456" || code.length === 6`).
  Success stores the session bearer (`kp_session_token`, tab lifetime) and routes to the
  role dashboard. No more client-side KYC flip to VERIFIED on OTP success.
- `verifyMfa` → `POST /api/auth/mfa`, surfacing the honest 501. No elevation path remains
  client-side; privileged console access continues through the console key gate.
- `logout` revokes the session server-side (best-effort) and clears the token.

### 2 · Portals send the session first, seed second

`getPortalToken` (`src/lib/customerPortalClient.ts`) now prefers the stored session bearer and
falls back to the sandbox dev seed. One lever covers the customer portal, the agent portal
(`getPortalBearer` callers), and every `portalFetch` user: logged-in users act as themselves;
anonymous demo browsing and existing batteries keep working unchanged.

### 3 · Theater removed from the auth pages

- `/otp`: resend is a real API call (was `setTimeout` + fake "dispatched" notice); test-mode
  codes render in a labeled sandbox banner; cooldown/cap aligned to the server (60s / 5).
- `/mfa`: killed the backup-code `setTimeout → router.push("/admin")` bypass — backup codes
  verify through the same honest step-up; preemptive "MFA not enrolled" banner added.
- `/reset-password`: real API call surfacing the honest 501 (was `setTimeout` → fake success).

## Live transcripts (prod build, :3000, `KORIE_ALLOW_OTP_TEST=true`)

| # | Call | Result |
|---|---|---|
| U1 | `GET /otp /login /register /mfa /reset-password /forgot-password /verify` | 200 ×7 |
| U2 | register (`08055500222` local format) → resend → verify → portal → logout → portal | `cust-ng-7429`, masked `+234 ••• ••• 0222`; session 200; portal resolves **Ui Flow +2348055500222** (per-user, local-phone normalized); logout `sessionRevoked:true`; portal 401 |
| U3 | dev-seed portal; junk `kp_sess_zzz` on portal | 200 (fallback intact); `INVALID_SESSION` |

Gates: `tsc --noEmit` clean, `next build` clean. No committed secrets; runtime residue in
`/tmp` stores only.

## Deliberate limitations (stated, not hidden)

1. Password login stays client-side demo auth (real `DEMO_PASSWORD` check, no session minted):
   a global demo password proves nothing about identity, so it must not mint sessions.
   Sessions come from OTP-to-registered-identifier only.
2. Portals are not gated: anonymous browsing rides the shared seed by design (demo posture).
   Per-user identity applies once the user completes OTP.
3. `tests/auth_suite.test.ts` still predates the demo-password check (doc 12) — untouched.
