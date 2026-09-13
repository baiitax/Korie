# 10 — Credential registry & console auth: remediation batch 1 (R-01, R-02)

Status: **DELIVERED + LIVE-PROBED** (prod build on :3000) · Date: 2026-09-13 · Branch: `feature/compliance-portal-demo-rebuild`

## Method

The assessment (`4e1bfaf`, §register R-01/R-02) found the API auth layer was format-only: any
`Bearer` string authenticated as `usr_dev_01` / `ORGANIZATION_ADMIN`, and 0/4 probed admin routes
checked anything at all. This batch replaces fabrication with verification. Every claim below
carries a file:line or a live transcript — nothing is asserted from memory.

## What changed

### R-01 · DeveloperWorkspaceEngine is now the credential registry (no parallel store)

`src/lib/developer/DeveloperWorkspaceEngine.ts` (+184):

- Stored verifiers: salted SHA-256 (`sha256(salt:raw)`), timing-safe compare. Raw secrets are
  returned once at create/rotate and never persisted; masked previews can never verify;
  `listCredentials`, rotate/revoke returns all strip hash+salt — hashes never leave the engine.
- `verifySecret(raw)` is the single choke point: `INVALID_API_KEY` / `KEY_REVOKED` /
  `KEY_EXPIRED` / `KEY_GRACE_LAPSED`, all fail closed. ROTATING honors the 24h grace window;
  revoke is immediate (verifier retained only so the code reads `KEY_REVOKED`, and there is no
  un-revoke path). Success touches `lastUsedAt` (file-backed usage proof).
- Two verifiable seeds (fixed, documented, sandbox-only): `cred_seed_dev`
  (`kp_test_cdb3db2b9b22a98c9c1b`, owner `usr_dev_01` — the exact token the customer/agent portals
  already send, so both keep working with zero client changes) and `cred_seed_admin` (ADMIN,
  all scopes). Legacy `cred_sand_01` has no hash: listed for inventory honesty, fails every
  verification. Scope matcher: exact | `prefix:*` | `*`.
- `createCredential` gained `ownerUserId` + `operatorRole`, an `operator-console` app branch
  (operator keys need no app, but require a role), and persists on every mutation.
  PRODUCTION issuance is still gated on approved production access.

### R-02 · Every admin + developers route is guarded (43 guards, 34 files)

- `src/lib/security/authMiddleware.ts` rewritten: no more hardcoded identity. Context (org,
  owner, role, scopes, env) comes from the verified credential row; scope enforcement with
  `FORBIDDEN_INSUFFICIENT_SCOPE` (403); registry errors fail closed (503).
- `src/lib/security/apiGuards.ts` (new): `adminApiGuard` (`admin:read` GET / `admin:write`
  mutations) on all 24 `/api/admin/*` files, `developerApiGuard` on all 9 `/api/developers/*`
  files. Error shape `{success:false,error:{code,message}}` matches console clients.
- New routes: `GET /api/admin/session` + `GET /api/developers/session` (whoami for the gates);
  `GET|POST /api/admin/operator-keys` + `POST …/[id]/rotate|revoke` (operator-console issuance).

### Console key bootstrap (no more silent open consoles)

- `src/lib/consoleKeys.ts` (new): per-console localStorage key, `adminFetch`/`devFetch`, masked
  fingerprints. `src/components/console/ConsoleKeyGate.tsx` (new): blocking first-run prompt
  (paste a key or one-click the documented bootstrap), server-whoami verification before render,
  persistent "sandbox bootstrap key in use — rotate me" banner while a seed is active.
  Wired into `AdminConsoleFrame` and `DeveloperShell`.
- 18 fetcher files rewritten to `adminFetch`/`devFetch` (incl. the shared `config/api.ts`
  helper covering all 5 config panels; `/api/complaints/*` calls deliberately left bare).
- New `/admin/api-credentials` page (+ nav): this-console fingerprint + live session, operator
  key inventory with masked values, issue (role→scope presets), rotate/revoke, raw-once reveal
  modal, bootstrap seed row flagged PUBLIC/ROTATE-ME.

### Ride-alongs

- KYC `POST /api/v1/kyc/verify-identity`: honest default — was canned `EXACT_MATCH`/99.4 with a
  fake default BVN; now requires `id_number`, answers `NOT_VERIFIED`/`NO_VERIFICATION_PROVIDER`
  (nulls, never a pass), 501 if a provider env is set without an integration. Zero in-tree
  consumers, so nothing else moved.
- Compliance DemoStrip: `PORTAL_DEMO_MODE` is now env-driven
  (`NEXT_PUBLIC_PORTAL_DEMO_MODE=false` hides; default shows), existing strips gated on it, and
  `DemoStripStandalone` renders shell-wide from `ComplianceShell`.
- Maker≠checker: `POST /api/admin/maker-checker/decisions` refuses `APPROVED` with 422
  `MAKER_EQUALS_CHECKER` when reviewer == requester (case-insensitive). Rejections may be
  self-recorded — they execute nothing.

## Live transcripts (prod build, :3000)

Auth core (15/15):

| # | Call | Result |
|---|---|---|
| 1 | `GET /api/admin/overview/executive`, no bearer | 401 `UNAUTHORIZED_MISSING_TOKEN` |
| 2 | same, `Bearer kp_test_deadbeef…` (self-minted) | 401 `INVALID_API_KEY` |
| 3 | same, dev seed | 403 lacks `admin:read` |
| 4 | same, admin seed | 200 |
| 5–6 | dev seed → developers credentials, customer portal | 200, 200 |
| 7–8 | issue app key → use on `/api/customer/360` | 201 raw-once → 200 |
| 9–11 | rotate → old raw (grace) + new raw | 200, 200, 200 |
| 12–13 | revoke new → reuse | 200 → 401 `KEY_REVOKED` |
| 14–15 | admin seed past write guard (engine 4xx, not 401/403); dev seed write | `INVALID_RESTRICTION` (guard passed); 403 lacks `admin:write` |

Consoles, keys, ride-alongs (14/14):

| # | Call | Result |
|---|---|---|
| A1–A3 | whoami admin/dev; dev key on admin session | `cred_seed_admin`/ADMIN; `cred_seed_dev`; 403 |
| A4 | operator-keys list | seed row masked `kp_test_…8046`, no hash field |
| A5–A9 | issue OPERATOR key → read 200 → write 403 → revoke → `KEY_REVOKED` | all as expected |
| A10–A11 | KYC verify + missing id | `NOT_VERIFIED`; 400 |
| A12–A13 | self-approval vs distinct reviewer | 422 `MAKER_EQUALS_CHECKER`; 200 |
| A14 | replay: no-bearer 401, self-minted 401, agent portal 200, FX quote POST 200 | green |

Gates: `tsc --noEmit` clean, `next build` clean. No committed secrets beyond the two
documented sandbox seeds. Battery-created keys live only in `/tmp/korie-developer-workspace.json`
(never committed).

## Deliberately NOT in this batch (batch-2 backlog)

1. `bankApiGuard` (`src/lib/bank/bankApiGuard.ts`) is still prefix-only (`kp_test_`/`kp_live_`).
   `/api/bank/v1/*` money paths accept any well-formed bearer. Next: route them through
   `verifySecret` with `bank:*` scopes.
2. Wallet lift/restrict take a checker email but record no restriction maker, so maker≠checker
   cannot be enforced there yet — needs maker attribution on restriction rows first.
3. `verify-otp` still mints unregistered `kp_sess_*`; no server sessions. Unchanged by design
   here: agent/customer portals ride the dev seed, sessions come with Supabase wiring.
4. Admin seed carries `developer:*` scopes (console reuse). Least-privilege split when operator
   roles stabilize.
5. `ADMIN_ATTENTION_BADGES` / rail `142ms` figures and other chrome numbers are untouched.
