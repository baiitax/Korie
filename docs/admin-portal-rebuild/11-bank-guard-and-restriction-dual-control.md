# 11 — Bank guard through the registry + restriction dual control: batch 2

Status: **DELIVERED + LIVE-PROBED** (prod build on :3000) · Date: 2026-09-13 · Branch: `feature/compliance-portal-demo-rebuild`

## Method

Batch-2 backlog from doc 10, items 1–2. Same discipline: every claim carries a file:line or a
live transcript.

## What changed

### 1 · `bankApiGuard` verifies against the registry (the prefix-only hole is closed)

`src/lib/bank/bankApiGuard.ts` rewritten: was `token.startsWith('kp_test_'|'kp_live_')` plus a
`KORIE_BANK_DEMO_KEY` backdoor (unset anywhere in-tree — removed outright). Now async
`bankApiGuard(req, 'read'|'write')`, `verifySecret` + `bank:read`/`bank:write` via the shared
scope matcher, distinct `UNAUTHORIZED_MISSING_TOKEN` / `INVALID_API_KEY` / `KEY_REVOKED` /
`KEY_EXPIRED` / `KEY_GRACE_LAPSED` / `FORBIDDEN_INSUFFICIENT_SCOPE` codes. The
`NextResponse | null` denied-pattern is kept, so the 5 call sites in the 4
`/api/bank/v1/*` routes (accounts GET read + POST write, funding write, liquidity read,
transfers write) changed by one line each.

- `bank:read` + `bank:write` added to `STANDARD_SANDBOX_SCOPES`, so both bootstrap seeds carry
  bank access — consistent with the seeds' existing full-sandbox grants
  (`payments:write`, `transfers:write`, `agency:write` …).
- `/admin/bank` page now sends the admin console key (`getAdminBearer`) instead of the
  customer-portal bearer.
- Scope-list updates do not propagate to already-persisted credential rows (`hydrate` replaces
  seeds wholesale); fresh scopes land on a clean store. The store is `/tmp`-ephemeral, so this
  bites only long-lived dev hosts — noted, not fixed.

### 2 · Restriction dual control is now enforceable (maker attribution + side door closed)

- `CustomerAccountRecord.restrictionMakers` (new optional field): who placed each restriction
  and when. `restrictions: string[]` is untouched — the authorization gateway and BankCore
  readers keep working.
- `applyRestriction(id, restriction, reason, maker?)` records the maker; `liftRestriction(id,
  restriction, checker?)` returns `MAKER_EQUALS_CHECKER` when the checker is the maker
  (case-insensitive) and clears the entry on success. Restrictions with no maker on file
  (pre-attribution rows) lift without the check — stated honestly, no silent bypass.
- Both admin wallets routes pass `body.actor` through (already required there).
- **`PATCH /api/accounts/[id]` was wide open** — unauthenticated RESTRICT/UNRESTRICT on any
  account, which would have made lift-side dual control theatre. Now admin-guarded
  (GET read / PATCH write), mutations require an actor email, `MAKER_EQUALS_CHECKER` maps to
  422. Its one in-tree caller (`/admin/customers` restriction modal) moved to `adminFetch`
  and gained an authorising-identity field.

## Live transcripts (prod build, :3000, fresh credential store)

| # | Call | Result |
|---|---|---|
| B1 | liquidity, no bearer | 401 `UNAUTHORIZED_MISSING_TOKEN` |
| B2 | liquidity, self-minted `kp_test_` (old guard: **admitted**) | 401 `INVALID_API_KEY` |
| B3–B4 | dev seed: liquidity 200; transfers bad-type | 200; 400 `UNKNOWN_TYPE` (guard passed) |
| B5 | read-only operator key on bank write / read | 403 / 403 |
| B6 | open ×2 → fund ₦50,000 → INTERNAL ₦12,000 | journals `ltx_…_oael7`, `ltx_…_35une` |
| D1–D2 | side-door PATCH: no bearer; no actor | 401; 400 `ACTOR_REQUIRED` |
| D3 | restrict (maker-a) → lift (maker-a) → lift (checker-b) | 200 → 422 `MAKER_EQUALS_CHECKER` → 200 |
| D4 | admin wallets: restrict (maker-c) → lift (maker-c) → lift (checker-d) | 200 → 422 → 200 |

Gates: `tsc --noEmit` clean, `next build` clean. Test account left clean (both holds lifted).
No committed secrets; runtime residue in `/tmp` stores only.

## Remaining backlog (batch 3)

1. `verify-otp` still mints unregistered `kp_sess_*`; no server sessions — needs the Supabase
   session layer, the largest remaining auth item.
2. Admin seed carries `developer:*` scopes (console reuse) — least-privilege split when
   operator roles stabilize.
3. Seed-scope migration for long-lived persisted stores (see note above).
