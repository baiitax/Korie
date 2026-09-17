> **Status update (2026-09-17): all 5 findings below have been remediated.**
> See `git log` for the commits: org_id tenant scoping + MFA enforcement
> (Findings #1–#2), SUPER_ADMIN dual-control on security-incident closure
> reusing the existing money-movement dual-control primitive (Finding #3),
> server-audited CSV export (Finding #4), and per-actor rate limiting on
> every `/api/admin/*` route (Finding #5). Every fix was unit-tested (tsc
> clean) and live-verified end-to-end against the real dev server and
> Supabase project — including firing 1,210 real concurrent requests at
> `/api/admin/session` to confirm the rate limiter actually returns 429s at
> the documented threshold, and a live two-distinct-admin dual-control
> vote/apply cycle against a real (temporary, cleaned-up) security incident
> row. The original findings are preserved unedited below as the record of
> what was found and why each fix looks the way it does.

# KoriePay Admin Portal — Security, Compliance & Accounting Review

**Scope:** `/admin/*` (36 pages), `/api/admin/*` (8 route files, backing 90+
database resources via the shared registry), `src/lib/admin/*`,
`src/lib/security/adminAuth.ts`, and the `organizations` /
`organization_members` / `roles` tenancy model those routes sit on.

**Method:** static review of every admin page, every `/api/admin/*` route,
the resource registry (`src/lib/admin/resourceRegistry.ts`, 1,053 lines,
~90 registered resources), the authorization gate (`adminAuth.ts`), and the
underlying migrations that define the tables/RPCs the portal reads and
writes. Cross-checked against the existing `SECURITY_REMEDIATION_REPORT.md`
and `PORTAL_HARDENING_ROADMAP.md` to avoid re-reporting closed findings and
to focus on what is genuinely still open.

**Headline:** this portal is in materially better shape than the Agent/
Aggregator/Regional portals were before their own hardening passes — there
is no fabricated data anywhere I could find (every page explicitly documents
having *replaced* an earlier fake version), mutations are audited, and
maker-checker is real and DB-enforced. The issues below are the honest
residue: one real access-control gap (cross-tenant data exposure), one real
authentication gap (no MFA enforcement on the highest-privilege portal in
the system), and a set of smaller compliance/operational gaps.

---

## 1. Critical — Cross-tenant data exposure in the admin resource registry

**Where:** `src/app/api/admin/data/[resource]/route.ts` and
`.../[id]/route.ts`, gated by `authorizeAdminRequest()` in
`src/lib/security/adminAuth.ts`.

**The gap:** `authorizeAdminRequest()` proves the caller holds an ACTIVE
`organization_members` row whose role is `SUPER_ADMIN`, `ORGANIZATION_OWNER`,
or `ORGANIZATION_ADMIN` **in at least one organization** — but it never
checks *which* organization, and the resource registry's `GET`/`PATCH`
handlers never filter by `org_id` at all. Every one of the ~90 registered
resources (`customers`, `wallets`, `ledger-accounts`, `ledger-transactions`,
`agents`, `merchant-profiles`, `aggregators`, `identity-persons`,
`audit-events`, …) is queried with a bare `.select()` — no `.eq('org_id', …)`
anywhere in `resourceRegistry.ts`, `resourceApi.ts`, or the two data routes.

Concretely: `organizations` is the tenancy boundary in this schema — every
merchant, and (per the seed scripts) potentially other tenants, gets its own
`organizations` row, and `customers`, `ledger_accounts`, `agents`,
`aggregators`, `merchant_profiles`, `audit_events`, etc. all carry `org_id`
foreign keys back to it (confirmed in `20260903000001_core_identity_and_tenancy.sql`,
`20260903000002_customers_and_wallets.sql`, `20260903000003_double_entry_ledger.sql`).
An `ORGANIZATION_ADMIN` of **any one** tenant who is granted admin-portal
access sees and can mutate **every tenant's** customers, wallets, ledger
accounts, agents, and audit trail — not just their own.

**Why this hasn't bitten yet:** today `SUPER_ADMIN`/`ORGANIZATION_OWNER`/
`ORGANIZATION_ADMIN` are only ever granted by hand via service-role seed
scripts (`scripts/seed-ops-admin.mjs`, etc.) against the single KoriePay HQ
organization (`10000000-0000-0000-0000-000000000001`) — there is **no
self-service path** anywhere in the app that lets a merchant or aggregator
signup end up with one of these three roles (confirmed: `merchant/register`,
`customer/register`, and `agent/register` never touch `organization_members`
except to assign the narrow `AGENT` role). So in the *current* deployment,
every admin-portal user is legitimately platform staff who should see
everything, and the practical blast radius today is low.

**Why it is still a real finding, not a false positive:** the code has no
mechanism that would stop this from becoming exploitable the moment a second
tenant is (deliberately or accidentally) granted an `ORGANIZATION_ADMIN`/
`ORGANIZATION_OWNER` row — e.g. a support ticket resolved by hand with a
`organization_members` insert, or a future self-service "invite an admin for
your business" feature. `ORGANIZATION_ADMIN`'s own seed comment describes it
as "Administrative access excluding settlement account manipulation" (per-org
semantics), which is not what the code actually enforces. This is a classic
**broken object-level authorization (BOLA/IDOR)** pattern: role-presence is
checked, tenant-scope is not.

**Recommendation:**
1. Add `org_id` scoping to `authorizeAdminRequest()` for `ORGANIZATION_OWNER`/
   `ORGANIZATION_ADMIN` (return the matched `org_id`, as it already does),
   and thread it through `resourceRegistry.ts`'s `ResourceDef` as a
   mandatory tenant column for every resource that has one — the registry
   already has the `filters` mechanism, so this is additive, not a rewrite.
2. Reserve unscoped, platform-wide visibility strictly for `SUPER_ADMIN`
   (the role explicitly modeled with "dual-control authorization
   requirements" in its own seed comment) — `ORGANIZATION_OWNER`/
   `ORGANIZATION_ADMIN` should never see another tenant's rows.
3. Add a regression test (mirroring `tests/aggregatorPermissions.test.ts`)
   asserting an `ORGANIZATION_ADMIN` scoped to org A cannot read or patch a
   resource row belonging to org B.

---

## 2. High — No MFA enforcement on the highest-privilege portal in the system

**Where:** `src/lib/security/adminAuth.ts` (`authorizeAdminRequest`).

**The gap:** `authorizeAdminRequest()` verifies a valid Supabase access
token and an ACTIVE role membership — full stop. It never checks
`auth.users`'s AAL (authenticator assurance level) or `user_profiles
.mfa_enabled`, even though:
- `user_profiles.mfa_enabled` / `mfa_enforced_at` columns already exist
  (`20260903000001_core_identity_and_tenancy.sql`) and are already read and
  displayed by the **compliance** portal's own session/posture routes
  (`src/app/api/compliance/session/route.ts`, `.../posture/route.ts`).
- The **Team & Access** admin page (`src/app/admin/team/page.tsx`) itself
  renders an `mfa_enforced` column per staff member — implying to whoever
  reads that page that MFA status matters and is enforced, when the portal's
  own authorization gate never checks it for anyone, including the viewer.
- The Aggregator portal (Phase B, this session) now has full, working,
  server-enforced TOTP MFA gating its privileged routes. The Admin portal —
  which can move real money (`/api/admin/approvals`), close the books
  (`/api/admin/accounting` POST), and read every customer's PII across every
  tenant (see §1) — has **none**.

**Why this matters more here than anywhere else:** admin-portal roles are
the platform's most powerful (`SUPER_ADMIN` is explicitly documented as
needing "dual-control," which doesn't exist either — see §3). A single
stolen password for an `ORGANIZATION_ADMIN`/`SUPER_ADMIN` account is a
complete platform compromise with no second factor anywhere in the chain.

**Recommendation:** extend `authorizeAdminRequest()` to require the
Supabase session's AAL to be `aal2` (i.e. a verified MFA factor was used at
sign-in) for at least `SUPER_ADMIN` and money-movement/PATCH-capable roles,
mirroring the pattern already built for the aggregator portal this session
(`requireAggregatorMfaIfEnforced`) — the primitive (`auth.mfa.enroll/
challenge/verify`) is already proven in this codebase, this is a matter of
wiring it into the one portal that still lacks it, and ideally *unconditionally
required* here rather than org opt-in, since there is no "org" concept that
should get to opt out of protecting platform-wide access.

---

## 3. High — `SUPER_ADMIN`'s own documented "dual-control" is not implemented

**Where:** `roles` seed data (`20260903000001_core_identity_and_tenancy.sql`,
line 96): `('SUPER_ADMIN', 'Platform-wide administrator with dual-control
authorization requirements', TRUE)`.

**The gap:** the role's own description promises dual control (a second,
distinct approver) for its actions. Nothing in `adminAuth.ts`,
`resourceRegistry.ts`, or the two data routes implements a maker-checker
requirement specifically for `SUPER_ADMIN`-initiated mutations — a lone
`SUPER_ADMIN` can PATCH any resource in the registry (including
`security-incidents`, `pam-requests`, `roles`) unilaterally. The **money-
movement** maker-checker system (`/api/admin/approvals`, §"Approvals" below)
is real and well-built, but it is a separate, narrower control that only
covers four specific movement types (float top-up, merchant payout, Adashi
payout, cash variance) — it does not cover the generic resource-registry
PATCH path that `SUPER_ADMIN` uses for everything else (role changes,
security incident status, PAM request approval, etc.).

**Recommendation:** either (a) update the role's own description to
accurately describe what is actually enforced (transparency/no fabricated
compliance claims — this is exactly the kind of "documentation vs.
enforcement" gap this program has flagged and fixed elsewhere), or (b) build
the dual-control the description promises for the specific `SUPER_ADMIN`
mutation surface that most warrants it (role/permission changes, security
incident closure). Given the "honesty first" principle already governing
this codebase (see `resourceRegistry.ts`'s own header comment), (a) is the
minimum acceptable fix even if (b) is deferred.

---

## 4. Medium — Bulk CSV export is a real, unaudited data-exfiltration path

**Where:** `src/components/admin/ResourceTable.tsx`, `handleExport()`.

**The gap:** every `ResourceTable` instance (i.e. every admin list page)
offers a "CSV" export button that builds a CSV client-side from whatever
rows are currently loaded and triggers a browser download — entirely
client-side, no server round-trip, and **no `audit_events` row is written**.
Compare this to every mutation path in the portal, which is scrupulously
audited (`.../data/[resource]/[id]/route.ts`'s PATCH handler even calls out,
in its own comments, a previous bug where a mutation silently failed to
audit and treats that as a serious defect). Read-and-export of bulk PII
(customer name/email/phone/KYC tier, agent details, identity-document
metadata, etc.) has no equivalent trail at all.

For a Tier-1 financial platform subject to NDPR (Nigeria Data Protection
Regulation) / GDPR-equivalent obligations in a WAEMU cross-border
jurisdiction, "who exported which customers' PII, and when" is a standard
audit requirement examiners will ask for, and today the honest answer is
"we cannot tell you — it happens entirely in the browser with no
server-side record."

**Recommendation:** move CSV generation server-side (or at minimum fire an
audit-log POST from the client immediately before triggering the download),
recording actor, resource, row count, and applied filters — the same
`audit_events` table already used everywhere else in this portal.

---

## 5. Medium — No rate limiting on any `/api/admin/*` route

**Where:** all 8 files under `src/app/api/admin/`.

**The gap:** `src/lib/security/rateLimiter.ts` exists and is used elsewhere
in the codebase (registration/intake routes, agent PIN verification per the
security report), but none of the admin routes call it. `GET /api/admin/data/
[resource]` in particular has no per-actor request throttle, so a single
compromised or malicious admin session (or a leaked long-lived access token)
can enumerate/scrape every resource in the registry — including full
customer/identity/ledger tables — at whatever rate the client can issue
requests, since pagination (`limit`/`offset`, max 200/page) is the only
constraint and nothing stops rapid sequential paging.

**Recommendation:** apply the existing rate limiter (per-actor, not just
per-IP, since these are authenticated sessions) to the data-plane GET routes
at minimum, and definitely to the accounting/approvals POST routes given
they trigger real financial operations (`run_daily_financial_close`,
`approve_merchant_payout`, etc.).

---

## 6. Low/Informational — Genuinely solid controls confirmed (no action needed)

To keep this review honest in both directions, the following were
specifically checked and found to be correctly implemented, not just
claimed:

- **Double-entry ledger integrity is real.** `run_daily_financial_close()`
  and `generate_trial_balance()` (migration `20260914000050`) independently
  re-derive every account balance from `ledger_entries` and flag drift,
  wallet/ledger desync, unbacked wallet balances, negative custodial
  accounts, aging clearing/escrow balances, and orphaned journals — this is
  a genuine accounting-integrity control, not a decorative dashboard. Seed
  scripts that post ledger entries explicitly rely on DB-side balance
  triggers to reject an unbalanced entry rather than trusting the script's
  own arithmetic (`scripts/seed-aggregator-demo.mjs`'s own comment on this).
- **Maker-checker for money movement is real and DB-enforced**, not a UI
  convention: `approve_merchant_payout()` raises
  `SEGREGATION_OF_DUTIES_VIOLATION` server-side if the approver equals the
  requester, and the same self-approval guard is declaratively wired into
  the generic resource-registry PATCH path (`selfApprovalGuard` on
  `pam-requests`) so a compliance/admin PATCH can't bypass it either.
- **No self-service path to admin/platform roles.** `ORGANIZATION_OWNER`/
  `ORGANIZATION_ADMIN`/`SUPER_ADMIN` are only ever granted via service-role
  seed scripts run out-of-band; none of the public registration routes
  (`customer`, `merchant`, `agent`) can produce one. This closes off the
  most obvious privilege-escalation vector into this portal.
- **Sensitive columns are explicitly excluded from the generic data plane**
  where they exist: `customer-identifiers` never selects
  `id_number_encrypted`; `webhook-endpoints`/`api-credentials` never select
  their secret-hash columns; `identity-documents` excludes its encrypted
  storage pointer. Each exclusion is deliberately commented in
  `resourceRegistry.ts` rather than being an accidental omission.
- **No fabricated data anywhere reviewed.** Every page's own header comment
  documents having replaced a specific previous fake behavior (hardcoded
  rows, fake ping animations, fake approve buttons, invented staff names,
  invented KPI numbers) with a real database-backed read — and spot-checking
  several of these against the actual resource registry/migrations confirms
  the claims are accurate, not just asserted.
- **Every generic mutation is genuinely audited** (append-only
  `audit_events`, DB-trigger-enforced no-UPDATE/no-DELETE), and a real,
  previously-live defect — the audit insert silently failing on every
  single admin PATCH because of a missing NOT NULL column — is documented
  as fixed in the route's own comments, which is a good sign of an
  evidence-based fix history rather than assumed-working code.

---

## 7. Summary table

| # | Finding | Severity | Category |
|---|---|---|---|
| 1 | Admin resource registry has no tenant (`org_id`) scoping — an `ORGANIZATION_ADMIN`/`OWNER` for one tenant can read/mutate every tenant's data | **Critical** (dormant today; no live exploit path since no multi-tenant admin exists yet, but the code has no guardrail if one is added) | Access control / IDOR |
| 2 | No MFA enforcement anywhere in `adminAuth.ts` — the most privileged portal in the system has weaker login hardening than the Aggregator portal now has | **High** | Authentication / cybersecurity |
| 3 | `SUPER_ADMIN` role's own documented "dual-control" requirement is not implemented for the generic mutation path | **High** | Governance / compliance fabrication (docs vs. enforcement mismatch) |
| 4 | Bulk CSV export of PII/financial data is entirely client-side and unaudited | **Medium** | Data protection / NDPR compliance / audit trail |
| 5 | No rate limiting on any `/api/admin/*` route | **Medium** | Cybersecurity risk (abuse/enumeration/DoS by an authenticated insider) |
| 6 | Double-entry integrity, maker-checker, role-escalation closure, and column-level PII exclusions all verified genuinely enforced | Positive finding | Accounting principles / management standards |

---

*This review is a point-in-time static assessment; it does not include
dynamic testing (no live requests were made against the running
application/database in the course of this specific review — findings are
derived from code, migrations, and configuration, cross-referenced against
each other for consistency).*
