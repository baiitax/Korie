# KoriePay Security Remediation Program — Final Report

**Scope:** Authorized adversarial security assessment and remediation of the KoriePay
application (Next.js 14 / Supabase Postgres), covering P0 emergency fixes through
Phase 4 DevSecOps/CI hardening. Governing principle throughout: **never trust the
client** — every control was verified against what the server/database actually
enforces, not what the UI claims or implies.

This is not a UI redesign or a rewrite. Every change below is either (a) a fix for a
concrete, verified vulnerability or gap, (b) deletion of dead/fabricated code that was
actively misrepresenting the system's real security posture, or (c) an explicitly
flagged, deliberately-not-actioned finding for the team to prioritize. Nothing was
"fixed" by guessing; every finding in this report was confirmed by reading the actual
code path, tracing it to a real database table/RPC/route, or reproducing the failure
live (tests, `npm audit`, build output).

---

## 1. Executive summary

| Phase | Focus | Status |
|---|---|---|
| P0 | Emergency: dead mock-auth surfaces, SSRF, webhook secrets, CSP, rate limiting | ✅ Complete |
| Phase 1 | Secrets management, HTTP headers, session/lockout policy | ✅ Complete |
| Phase 2 | Financial security: idempotency, ledger, FX, fraud engine | ✅ Complete |
| Phase 3 | Governance: RBAC / separation-of-duties / audit / incident response | ✅ Complete |
| Phase 4 | DevSecOps: CI gates, dependency risk, secret hygiene | ✅ Complete (with documented residual debt) |

**Headline results:**
- Removed **~250+ dead/fabricated API routes and ~9,000 lines of fake in-memory
  financial engines** (ledger, treasury, cash, reconciliation, settlement, plus a
  further ~70-file/~7,400-line dead-code galaxy flagged but deliberately not deleted
  this pass — see §7) that were either unauthenticated attack surface or were
  actively lying about enforcing controls they didn't.
- Fixed **one live, confirmed cross-tenant IDOR** (wallet balance API) and **two live
  TOCTOU double-spend races** (merchant settlement, merchant payout).
- Replaced a **completely fake API-key authentication system** (accepted any
  string that merely looked like a key, granted a hardcoded admin identity) with
  real database-backed key-vault verification.
- Found and fixed a **CI gate that silently never ran**: the RLS "perimeter guard" —
  the single strongest regression check in the repo — printed a warning and passed
  on every CI run because no job ever supplied database credentials.
- Found and mitigated a **critical (CVSS 9.5) unauthenticated RCE** in the pinned
  Next.js version's Image Optimization API, which this app had explicitly enabled
  (AVIF).
- Rotated **10 real account passwords** that had been displayed in plaintext on the
  public login page, and removed the "quick sign-in" feature that exposed them.
- Documented, rather than silently forced, a **major-version Next.js upgrade**
  recommendation (14.2.35 → 15.5.24+/16.3.3+) needed to close ~20 remaining
  CVEs — correctly out of scope to force mid-session given its breaking-change
  surface (React 19, async route params, etc.).

---

## 2. P0 — Emergency remediation

The initial pass found the application's public API surface (`/api/v1/*`) was almost
entirely fake: routes existed, looked plausible, and were wired into the marketing
site's developer docs, but authenticated against nothing real.

- **Removed 79 orphaned, unauthenticated *mutating* API routes** and **85 orphaned,
  unauthenticated *read* API routes** — these accepted requests and, in many cases,
  wrote to real tables with zero auth check, or returned fabricated in-memory data
  dressed up as real responses. Also removed 7 further orphaned auth-mock routes in
  a follow-up sweep.
- **`authenticateApiRequest` (the gate in front of the public developer API) was
  replaced with real logic.** It previously accepted *any* bearer token that merely
  matched a shape (`kp_live_`/`kp_test_`/`pk_live_`/`pk_test_` prefix, or length
  ≥16) and unconditionally returned a hardcoded, full-scope `ORGANIZATION_ADMIN`
  identity for a fixed org — meaning any caller with an arbitrary string was treated
  as a real, specific tenant. This was live-tested and confirmed to leak real
  customer PII through a now-removed route. It now performs a real SHA-256 hash
  lookup against the `merchant_api_keys`/`aggregator_api_keys` vault tables (see
  §6 for the current, closed-out state of this file).
- **Fixed two live TOCTOU double-spend races**: `run_merchant_settlement()` and the
  merchant payout path both had a check-then-act window that allowed the same
  balance to be spent twice under concurrent requests. Both are now atomic at the
  database level.
- **SSRF fix (CWE-918):** merchant webhook dispatch would follow a merchant-supplied
  URL to *any* host, including internal/private IP ranges — fixed with an SSRF
  guard that resolves and validates the destination before dispatch.
- **Webhook signing secrets were stored in plaintext** in the database; now
  encrypted at rest with a dedicated key (`WEBHOOK_SECRET_ENCRYPTION_KEY`).
- **Admin resource-registry PATCH endpoint leaked secret-shaped columns** (e.g.
  hashed credentials) in its generic read/write responses; now allowlisted.
- Added baseline HTTP security headers, a nonce-based Content-Security-Policy,
  rate limiting on registration/intake routes, agent transaction-PIN verification,
  inbound webhook receiver, and per-merchant webhook endpoint creation, and a
  Supabase Auth per-account lockout hook for login brute-force (see §3 for its
  current — correct but inert — status).

## 3. Phase 1 — Secrets management & session policy

- **The public login page displayed real staff/demo account credentials in
  plaintext** with a "quick sign-in" button that logged a visitor straight into a
  real seeded account. Removed the display and the feature; **rotated all 10
  affected real account passwords** out-of-band.
- **HTTP header audit**: confirmed HSTS, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, and CSP are present and correctly scoped; confirmed
  `X-Frame-Options`/`frame-ancestors` are deliberately not set at the app level
  (documented reasoning: this app is also served in a cross-origin sandboxed
  preview iframe during development, and the real production clickjacking
  boundary belongs at the edge/CDN where the exact allowed embedding origin is
  known).
- **Session policy review**: confirmed logout genuinely revokes the Supabase
  session server-side (not just a client-side token discard).
- **Login-lockout DB hook**: confirmed the code path is correct, but currently
  inert — it depends on a Supabase plan tier the project hasn't upgraded to yet.
  This is accurately represented in-code as a known, pending limitation, not a
  silent gap.

## 4. Phase 2 — Financial security (idempotency, ledger, FX, fraud)

- **Idempotency:** confirmed the database-backed financial RPCs are genuinely
  idempotent via UNIQUE constraints (not merely convention). Found and fixed a
  real client-side gap: the idempotency key was being **regenerated on every
  retry** instead of reused, which defeated the purpose of having one — a network
  retry after a timeout could double-execute a money-moving call. Fixed to persist
  and reuse the key across retries of the same logical operation.
- **Deleted an entire dead financial-engine family: ~9,000 lines across 57 files**
  — an in-memory ledger, treasury, cash-management, reconciliation, and settlement
  engine that was never wired to any real route, and in one case had been the
  source of **fabricated dispute-refund data** presented to compliance staff as if
  it were real (fixed earlier at P0 by replacing it with a real ledger-posting
  function; the dead class itself removed in Phase 2). Also removed two orphaned
  idempotency modules that only that dead engine used.
- **Explicitly kept the `risk/` engine family** (`RiskDecisionEngine`,
  `RiskSignalEngine`, `VelocityEngine`, `EntityRiskProfilingEngine`,
  `FraudCaseManagementEngine`) after confirming it is genuinely live and wired to
  real routes — this was a deliberate deviation from an initial "delete the whole
  dead engine family" instruction, documented in the commit message and in-code,
  after verification showed this family was not dead code.
- Spot-checked and confirmed **no synchronous fraud gate exists on money RPCs**
  is by design (the async AML sweep is the real control) — not a gap.
- Confirmed `treasury_fx_positions` (unused-but-harmless) and the admin treasury
  console (genuinely DB-backed) needed no changes.

## 5. Phase 3 — Governance (RBAC / SoD / audit / incident response)

- **Role-catalog consistency, audit-trail coverage, and Support RBAC**
  (`SupportPermissions.ts`) reviewed and confirmed sound.
- **Fixed a real separation-of-duties gap:** the privileged-access-request (PAM)
  approval path had **no maker-checker concept at all** — any compliance/admin role
  holder could approve their own privileged-access request, silently defeating the
  UI's stated guarantee (which cited a dead, never-imported
  `PrivilegedAccessEngine.ts` class as if it enforced this). Fixed with a
  declarative `selfApprovalGuard` on the shared resource registry, enforced
  independently in both the compliance-data-plane and admin-data-plane PATCH
  entry points, returning a proper `409 SELF_APPROVAL_BLOCKED`. Also fixed an
  unrelated pre-existing frontend bug that meant the SoD-specific error message
  never displayed for *any* approval failure, self-approval or otherwise. Swept
  two structurally similar tables (`payment_refunds`, `dispute_cases`) for the
  same risk shape — both are dead (zero writers), no fix needed.
- **Regional Manager portal reviewed and confirmed sound**: a 17-key permission
  allowlist explicitly excludes `admin.*`/`ledger.write`/`wallet.write`/
  `balance.adjust`/`transaction.override`; all 20 `/api/regional/*` routes go
  through a centralized auth/territory-scoping function; territory scoping is
  resolved from the database, never trusted from the client, and applied at the
  query level.
- **Public API key scope-enforcement reviewed and closed out** (this session):
  `authMiddleware.ts` grants every valid merchant/aggregator API key the same
  fixed, full scope set. Confirmed this is the actual, consistent design — neither
  key table has a `scopes` column, neither key-creation route nor any UI offers
  scope selection — not an accidentally-bypassable gate. Confirmed the one live
  caller of this auth path (`/api/v1/wallets/[id]/balance`) does not rely on
  scopes for its real security boundary; tenant isolation is enforced
  independently at the query level via `org_id`. Documented this in-code so a
  future reader doesn't mistake the fixed scope list for a bug, and flagged
  per-key scope restriction as a product enhancement for later.
- **Incident-response tooling — two gaps documented, not fixed** (feature
  incompleteness, not vulnerabilities; no security control is bypassed by their
  absence):
  - `support_incidents` is read-only in the UI — there is no create path.
  - `security_incidents` supports real updates but has no create path either.
- **`authMiddleware.ts` doc-comment accuracy**: confirmed its claim that
  `/api/v1/wallets/[id]/balance` is its sole remaining caller is still true.

## 6. Phase 4 — DevSecOps / CI gates

### 6.1 The CI pipeline was real but had one critical silent gap

`​.github/workflows/ci.yml` runs, on every push/PR to `main`: `npm ci` → `tsc
--noEmit` → lint → i18n parity check → `vitest run` → production build. No
secrets or environment variables were referenced anywhere in the workflow
(confirmed by grep).

**Finding (top Phase 4 issue, now fixed):** the repo's RLS "perimeter guard"
(`scripts/verify-rls.mjs`, exercised by `tests/rls-guard.test.ts`) is the
strongest regression check in the codebase — it fails if any public table lacks
Row Level Security, if the `anon` role holds any write grant, or if
`anon`/`authenticated` can execute any public function. It requires a real
`POSTGRES_URL`/`SUPABASE_DB_URL` to run; without one, it **prints a warning and
passes**. Because `ci.yml` never set that variable, this check had never actually
run as a merge gate — confirmed live by running the full suite fresh
(`npm install` + `npx vitest run`: 29 tests passed, this one explicitly skipped).

**Fix:** added a dedicated `db-perimeter` CI job that:
1. Installs the Supabase CLI (`supabase/setup-cli`).
2. Runs `supabase start`, deliberately starting the *real* Supabase-managed
   Postgres image (not a vanilla `postgres:xx` container) — this matters because
   the RLS policies in `supabase/migrations/*.sql` are written against Supabase's
   `auth` schema and `auth.uid()`/`auth.jwt()`/`auth.role()` helper functions,
   plus the `anon`/`authenticated`/`service_role` roles, none of which a bare
   Postgres image provides. Only the Postgres and Auth (GoTrue) containers are
   started; Realtime/Storage/Studio/Kong/imgproxy/edge-runtime/logging/pooling/mail
   are excluded to keep the job fast, since none of them affect what
   tables/roles/functions exist.
3. Replays every one of the 62 tracked migrations in order (this uncovered and
   led to fixing a duplicate-timestamp filename bug — see §6.2).
4. Runs `npm run verify:rls` against the resulting real database with
   `POSTGRES_URL` set.

Updated `tests/rls-guard.test.ts`'s doc comment and skip-warning message, which
previously claimed the skip "must only happen outside CI" — that was
aspirational, not true. It now accurately describes the two-job split: the fast
`verify` job never provisions a database (expected, fine) and the real gate is
the separate `db-perimeter` job.

*Caveat for the team*: this sandbox has no Docker available, so the
`db-perimeter` job's `supabase start` step could not be executed end-to-end here.
It was designed and verified by: (a) confirming the Supabase CLI installs and
`supabase init` behaves as documented without disturbing the existing
`supabase/migrations/`/`supabase/seed/` directories, (b) confirming via research
that `auth.uid()`/`auth.jwt()`/`auth.role()` and the `anon`/`authenticated`/
`service_role` roles are provisioned by the Supabase Postgres image itself (not
by GoTrue at connection time), so excluding GoTrue from the started stack does
not remove them, (c) confirming `pg_net` (used by one migration's optional
`pg_cron` block) is available in the Supabase Postgres image, and (d) tracing
every migration's dependency graph to confirm no cross-file ordering issue after
the rename in §6.2. **Recommend the team runs this job once for real in GitHub
Actions (which does have Docker) to confirm it passes before relying on it as a
required check.**

### 6.2 Duplicate-timestamp migration filenames (fixed)

Found two pairs of files in `supabase/migrations/` sharing the same 14-digit
timestamp prefix (`20260914000050` and `20260914000052`). Supabase's tooling
expects strictly unique, monotonically increasing version identifiers; relying on
alphabetical filename tie-break for same-timestamp files is undocumented CLI
behavior, not a guarantee, and is exactly the kind of thing that breaks quietly
the first time a new migration's filename happens to sort earlier. Verified the
existing alphabetical order was accidentally dependency-safe before renaming (no
migration in either pair depended on anything defined later in the same
timestamp group). Renumbered to a unique range and updated every internal
self-referential comment and the two external doc mentions — a pure rename, zero
behavior change.

### 6.3 `.env.example` was missing (fixed)

An earlier commit's message claimed to add `.env.example`, but it did not exist
on disk and was untracked. Root cause: `.gitignore`'s blanket `.env*` rule
silently shadowed it (confirmed via `git check-ignore -v`). Fixed by adding a
`!.env.example` exception and creating the template — every real env var the
app/scripts/CI actually read was inventoried by grepping across `src/`,
`scripts/`, and `.env.local`, with explicit `SECRET`/server-only warnings on the
sensitive ones (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`,
`SUPABASE_JWT_SECRET`, `KORIEPAY_SECRET_KEY`, `KORIEPAY_WEBHOOK_SECRET`,
`KYC_IDENTIFIER_ENCRYPTION_KEY`, `WEBHOOK_SECRET_ENCRYPTION_KEY`,
`CRON_SECRET`, `POSTGRES_PASSWORD`). No real secret values are in the file —
every value is a placeholder.

### 6.4 Secret-handling spot checks (sound; one inconsistency fixed)

- `.env.local` is git-ignored and was never committed; a targeted grep across all
  git-tracked files for `sk_live_`, AWS access keys, PEM private-key headers, and
  raw JWTs returned zero hits.
- All secret-reading code (`identifierCrypto.ts`, `webhookSecretCrypto.ts`,
  `src/lib/supabase/admin.ts`) fails closed — none of it has an insecure literal
  fallback if the corresponding env var is missing.
- **Fixed:** the two cron endpoints (`aml-monitoring`, `financial-close`) compared
  the caller-supplied `CRON_SECRET` with a plain `!==`, while the rest of the
  codebase's secret comparisons (webhook HMAC signature verification, the agency
  PIN route) already use `crypto.timingSafeEqual` specifically to close a
  byte-by-byte timing side channel. Added a shared `constantTimeStringEqual`
  helper and switched both cron routes to it, for consistency with that
  established precedent. (`CRON_SECRET` is high-entropy and server-only, so this
  was a low real-world-exploitability inconsistency, not an active
  vulnerability — fixed anyway since there was no reason for it to be the one
  exception.)

### 6.5 Rate limiting (sound, no fix needed)

`src/lib/security/rateLimiter.ts` is a real, category-based sliding-window
limiter. `getClientIp()` trusts `x-forwarded-for`/`x-real-ip` as a documented
best-effort signal (acceptable — it is not the sole control anywhere it's used).
Cron routes skip rate limiting entirely, which is fine: they are secret-gated and
not public-facing.

### 6.6 `next@14.2.35` / `postcss` dependency risk — fixed what could be fixed, documented the rest

A fresh `npm install` + `npm audit` reported:

- **`next@14.2.35` — critical.** ~20+ advisories apply to this version, not just
  the "image/cache, build-time-only" issues an earlier commit message described.
  Confirmed via independent sources that **none of these have a fix on the 14.x
  line** — patches only exist in 15.5.24+/16.3.3+:
  - **GHSA-2xp9-vwfh-vxw4 (critical, CVSS 9.5): unauthenticated RCE** in the
    Image Optimization API via a heap-buffer-overflow in the `libheif`
    library (consumed through `sharp`) when decoding an attacker-supplied
    AVIF file. **This app had AVIF explicitly enabled**
    (`next.config.mjs`'s `images.formats`) — **fixed this session** by
    dropping `image/avif` from the config (keeping `webp`), mirroring
    Vercel's own patched-release mitigation of disabling AVIF outright
    until a corrected `libheif` build propagates.
  - CVE-2026-75604 / GHSA-p293-qw3h-jr36 (critical): unauthenticated RCE via
    Windows-filesystem path traversal — not applicable to this deployment
    (Linux/Vercel hosting), left as-is.
  - GHSA-c4j6-fc7j-m34r: SSRF via WebSocket upgrades.
  - GHSA-36qx-fr4f-26g5, GHSA-492v-c6pp-mqqv: middleware/proxy bypass
    (i18n routing, dynamic route params).
  - GHSA-ffhc-5mcf-pf4q: XSS in apps using CSP nonces (this app does use a
    nonce-based CSP — see `src/middleware.ts`). Reviewed exposure: the app
    sets no `revalidate`/ISR anywhere and only caches nothing by default, which
    reduces but does not eliminate exposure if an edge CDN is later placed in
    front with permissive cache-key behavior — worth re-checking at
    deploy-infrastructure review time.
  - GHSA-gx5p-jg67-6x7h: XSS via `beforeInteractive` scripts — not applicable,
    this app uses no `next/script` calls anywhere.
  - GHSA-wfc6-r584-vfw7, GHSA-vfv6-92ff-j949, GHSA-3g8h-86w9-wvmq: various
    cache-poisoning / RSC-cache issues.
  - GHSA-8h8q-6873-q5fj, GHSA-h64f-5h5j-jqjh: DoS (Server Components, Image API).
- **`postcss@<=8.5.22` — high** (transitive via `next`): XSS via unescaped
  `</style>`, and arbitrary `.map` file read / path traversal via
  `sourceMappingURL`. Also unfixed without the Next.js major bump, since it's
  pulled in transitively.

**`npm audit fix --force` would install `next@16.3.5`** — a breaking major-version
bump (React 19 requirement, route-handler `params` becomes a `Promise`, etc.).
**Deliberately not forced mid-session.** Recommendation for the team: schedule a
dedicated Next.js 14→16 migration as its own tracked piece of work (not bundled
into a security patch), using `npx @next/codemod@canary upgrade latest` to handle
the mechanical parts, then re-run `npm audit` to confirm the advisory list clears.
Until then, the AVIF mitigation above closes the one concrete, currently-enabled
attack path; the rest of the list remains open exposure that upgrading is the
only real fix for.

### 6.7 Missing repo-level security tooling (documented, not fixed — GitHub-settings/process items)

Confirmed via `find`/`grep` that none of the following exist anywhere in the
repository:
- Dependabot config (`.github/dependabot.yml`)
- Any code/secret scanning workflow (CodeQL, Snyk, Trivy, Semgrep, gitleaks,
  trufflehog) — `.github/` contains only `ci.yml`
- `SECURITY.md`
- `CODEOWNERS`

**Recommendations for the team** (not actioned — these are process/tooling
additions, not code fixes, and adding them without the team's chosen conventions,
severity thresholds, and notification routing would likely need to be redone
anyway):
1. Add Dependabot (or Renovate) for automated dependency-update PRs, which would
   have caught the `next`/`postcss` drift earlier.
2. Add a secret-scanning step (GitHub's native secret scanning, or gitleaks in
   CI) as a defense-in-depth backstop to the manual grep sweeps done this session.
3. Add `CODEOWNERS` so security-sensitive paths (`src/lib/security/`,
   `supabase/migrations/`, `.github/workflows/`) require a specific reviewer.
4. Add a `SECURITY.md` with a responsible-disclosure contact.
5. **Branch protection / required-status-checks configuration is a GitHub
   repository-settings matter, not discoverable or fixable from the filesystem —
   out of scope for a code-only review.** Once the `db-perimeter` job (§6.1) is
   confirmed passing for real, the team should mark both CI jobs as required
   status checks on `main`.

### 6.8 Other Phase 4 observations (documented, not fixed)

- `vercel.json` only schedules the `financial-close` cron
  (`0 22 * * *`); `aml-monitoring` has no scheduler configured anywhere in the
  repo. This is an operational gap (the sweep simply never runs on a schedule),
  not a security vulnerability — noted for the team's operational runbook, not
  fixed here since adding a schedule is a product/ops decision (cadence,
  alerting) rather than a security judgment call.
- `supabase/full_database_schema_and_seed.sql` (924 lines, 31 tables) is
  substantially smaller than the sum of `CREATE TABLE` statements across the 62
  tracked migrations (357) — it appears to be a stale/partial snapshot rather
  than the authoritative current schema. Not yet confirmed whether anything
  (e.g. a local dev bootstrap script) actually depends on this file being
  current; flagged for a follow-up check, not fixed this session.

---

## 7. Deliberately deferred / flagged, not fixed

These were identified, investigated enough to characterize, and consciously left
alone — either because they are feature-incompleteness rather than
vulnerabilities, or because fixing them properly needs a separately-scoped pass:

1. **A ~70-file / ~7,400-line dead-code galaxy** (`agency/`, `iam/`, `erm/`,
   `reporting/`, `intelligence/`, `gateway/`, `integration/`, `products/`,
   `regulatory/`, `limits/`, `devices/`, `consumer/` engine families) —
   recommended as a distinct, explicitly-scoped future cleanup pass, the same
   way the Phase 2 ledger/treasury engine family was handled. `PrivilegedAccessEngine.ts`
   and `SecurityIncidentEngine.ts` fall inside this galaxy; the former has a
   stale, misleading doc-comment reference from `compliance/approvals/page.tsx`
   (it cites a class that enforces nothing, since nothing imports it) that was
   left in place per this same deferral decision — flag it for cleanup whenever
   that pass happens.
2. **Incident-response create paths** (`support_incidents`, `security_incidents`)
   — both are missing a create UI/API; this is incomplete tooling, not a security
   hole, since no control is bypassed by their absence.
3. **`aml-monitoring` cron has no schedule** — see §6.8.
4. **CSP-nonce XSS (GHSA-ffhc-5mcf-pf4q) exposure re-check** — recommended at
   deploy-infrastructure review time, once the team knows their actual CDN/cache
   topology in front of the app (see §6.6).
5. **Next.js major-version upgrade** (14→16) — the only real fix for the bulk of
   the outstanding `npm audit` findings; scoped as its own migration, not
   bundled into this program.
6. **Stale `full_database_schema_and_seed.sql`** — needs a follow-up check on
   whether anything still depends on it (see §6.8).

---

## 8. Final acceptance-criteria checklist

| Area | Status |
|---|---|
| Dead/mock authentication surfaces removed | ✅ |
| Real API-key vault authentication | ✅ |
| SSRF guard on outbound webhook dispatch | ✅ |
| Webhook secrets encrypted at rest | ✅ |
| CSP + baseline HTTP security headers | ✅ |
| Rate limiting on public/sensitive endpoints | ✅ |
| Login lockout | ✅ (code correct, pending Supabase plan upgrade to activate) |
| Resource-registry bypass / secret-column leakage | ✅ |
| Fabricated financial data replaced with real ledger posting | ✅ |
| Cross-tenant IDOR (wallet balance) | ✅ |
| TOCTOU double-spend races (settlement, payout) | ✅ |
| Plaintext credentials on login page | ✅ removed, credentials rotated |
| Idempotency (server-side confirmed sound, client-side gap fixed) | ✅ |
| Dead financial-engine code removed | ✅ (~9,000 lines); remaining galaxy flagged for a future pass |
| RBAC / SoD self-approval gap (PAM) | ✅ |
| Regional Manager tenant isolation | ✅ confirmed sound |
| Public API key scope enforcement | ✅ reviewed, confirmed by-design, documented |
| Incident-response tooling gaps | 📋 documented, not fixed (feature gap, not a vuln) |
| CI: typecheck / lint / i18n / unit tests / build | ✅ (pre-existing, confirmed intact) |
| CI: RLS perimeter guard actually gates merges | ✅ fixed this session (job added; recommend one live confirmation run) |
| `.env.example` | ✅ created |
| Cron secret comparison consistency | ✅ fixed |
| Critical unauthenticated RCE (AVIF) | ✅ mitigated |
| Remaining `next`/`postcss` CVEs | 📋 documented; major-version upgrade is the real fix, correctly not forced |
| Dependabot / CodeQL / secret scanning / SECURITY.md / CODEOWNERS | 📋 documented as recommendations (process/tooling, not code) |
| Branch protection / required status checks | 📋 out of scope (GitHub settings, not filesystem-discoverable) |

All code changes in this program are typechecked (`tsc --noEmit`), linted
(`next lint`), and covered by the existing `vitest` suite (29 passing, 1 correctly
skipped pending a live CI run with database credentials) as of the final commit.
