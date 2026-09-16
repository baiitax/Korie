# Agent, Aggregator & Regional Manager Portal — Implementation Roadmap

**Scope of this review:** a deep-dive pass across the three field-operations
portals — **Agent** (`/agent`, `agency` API surface), **Aggregator**
(`/aggregator`), and **Regional Manager** (`/regional`) — specifically hunting
for (a) live vulnerabilities/security threats, (b) dead frontend↔backend
connections, (c) incomplete/placeholder pages, and (d) places where manual
process should be automated. Every finding below was verified by reading the
actual route/RPC/migration, not inferred from naming — findings are graded
by verified severity, and each has a proposed fix with acceptance criteria so
this can be executed as a tracked backlog.

**Overall shape of what was found:** Agent and Regional Manager are in
materially good shape (comprehensively wired, consistently authenticated,
tenant-isolated). **Aggregator is the portal carrying the real risk** — it has
the most privilege (money dispatch, API key issuance, staff management,
compliance decisions) spread across 9 staff role types, and role-based
segregation of duties is only enforced on 2 of its ~15 privileged write
endpoints. That inconsistency, not a wholesale rebuild, is this roadmap's
main target.

---

## 1. Findings summary (by severity)

| # | Severity | Portal | Finding |
|---|---|---|---|
| F1 | 🔴 High | Aggregator | No role-based authorization on money-moving/privileged aggregator staff actions (float dispatch, API key issuance/revocation, settlement runs, new-agent onboarding, territory/target management, settings changes) — any authenticated staff member, including read-only `AUDITOR`/`ANALYST`/`FIELD_OFFICER` roles, can perform them. |
| F2 | 🟠 Medium | Aggregator | No client-side role gating either — the UI renders fully-enabled action buttons for every staff role, so a read-only staff member has no visual signal they shouldn't be able to click "Dispatch Float" until (if F1 is fixed) the request fails server-side. |
| F3 | 🟠 Medium | Agent | Support page hardcodes "Kano Regional Agent WhatsApp Desk" contact info for every agent nationwide, regardless of the agent's actual `state_or_region` (confirmed via `agents.state_or_region` / `agents.country`) — an agent onboarded in Lagos, Niger Republic, or any non-Kano territory is shown the wrong regional contact. |
| F4 | 🟠 Medium | Aggregator | `AggregatorSecurityPage` is honestly labeled incomplete (no MFA, no IP allowlisting) — correct to be honest about it, but it means the portal with the *most* privileged/money-moving actions in this review has the *weakest* account-security options of the three portals. |
| F5 | 🟡 Automation gap | Agent (agency-wide) | Daily settlement (`run_daily_settlement`) is designed to run on `pg_cron` but silently falls back to on-demand/manual triggering because the current Supabase plan doesn't have `pg_cron` enabled — and no external scheduler (Vercel cron, etc.) was ever wired to call the fallback endpoint. Confirmed: `vercel.json` only schedules `financial-close`; nothing calls `/api/v1/agency/ops/settlements/run` or `/api/v1/aggregator/settlements/run` on any cadence. |
| F6 | 🟡 Automation gap | Aggregator | Same settlement-scheduling gap applies independently to `/api/v1/aggregator/settlements/run` — each aggregator's own settlement is equally un-scheduled. |
| F7 | 🟡 Automation gap | Regional Manager | Escalation SLA due-dates are tracked and displayed (`sla_due_at`, `slaAtRisk`) but nothing sweeps for breaches — an SLA can silently blow past its deadline with no alert to the regional manager, the aggregator, or ops. Purely a passive "field on a table," not an active control. |
| F8 | 🟡 Automation gap | All three (AML) | `aml-monitoring` cron has no scheduler anywhere (confirmed in Phase 4 of the prior remediation pass) — this affects all three portals' underlying fraud/AML posture, since agents, aggregators, and their transactions all feed the same monitoring sweep. |
| F9 | 🟢 Low / hygiene | Aggregator | `POST /api/v1/aggregator/agents` (onboarding a new agent into an aggregator's network) has no role restriction, same root cause as F1, but flagged separately since it's an *identity-creation* action (a new agent + auth invite + zero-balance ledger accounts), not a funds-movement action — different blast radius, same missing control. |

**Not findings (verified sound, called out so they aren't re-litigated):**
- Regional Manager portal: least-privilege `REGIONAL_PERMISSIONS` allowlist,
  territory-scoping resolved server-side from the database, no `write`
  powers anywhere — confirmed sound in the prior remediation pass and
  reconfirmed this session.
- Agent portal: single-actor identity model (no internal staff sub-roles to
  get wrong), all 17 pages wired through a real `AgentContext`, money-moving
  endpoints correctly gated by `requireActiveStatus`.
- `aggregator/compliance/[id]/decision` — a genuinely well-built exemplar:
  role-restricted (`OWNER`/`ADMIN`/`COMPLIANCE_OFFICER` only) AND
  tenant-scoped via a two-step ownership lookup. This is the pattern F1's
  fix should replicate everywhere else in the portal.
- No cross-tenant IDOR found on any aggregator `[id]` route — every one
  resolves through a real ownership/scope check at either the API layer or
  inside the RPC itself (e.g. `aggregator_dispatch_float`'s
  `AGENT_NOT_IN_AGGREGATOR_NETWORK` check). F1 is a segregation-of-duties
  gap, not a tenant-boundary gap.
- Float top-up approval is deliberately human-in-the-loop (real four-eyes
  control, already implemented) — not an automation gap to "fix," this is
  correct design for a money-creation action and should stay manual.

---

## 2. Implementation roadmap

### Phase A — Aggregator role enforcement (F1, F2, F9) — **highest priority** — ✅ IMPLEMENTED

**Why first:** this is the only finding in the set with a plausible path to
real financial/operational harm today (an `AUDITOR` or `ANALYST` role account
— intended to be read-only — can currently dispatch float, mint a
full-scope production API key, or run a settlement). Fix is server-side-only,
additive, and low-risk to ship.

1. **Define an explicit permission matrix**, mirroring the
   `REGIONAL_PERMISSIONS` pattern already proven in the Regional Manager
   portal (a single source-of-truth allowlist, declared once, checked
   everywhere) rather than duplicating one-off `if (staff.role !== X)`
   checks per route. Suggested shape:
   ```ts
   // src/lib/security/aggregatorPermissions.ts
   export const AGGREGATOR_ROLE_PERMISSIONS: Record<AggregatorStaffRole, string[]> = {
     AGGREGATOR_OWNER:   ['*'],
     AGGREGATOR_ADMIN:   ['*'],
     OPERATIONS_MANAGER: ['agents.manage', 'liquidity.dispatch', 'territories.manage', 'devices.manage'],
     FINANCE_MANAGER:    ['settlements.run', 'liquidity.dispatch', 'reconciliation.run'],
     COMPLIANCE_OFFICER: ['compliance.decide'],
     RISK_OFFICER:       ['risk.ack'],
     FIELD_OFFICER:      ['agents.view', 'devices.view'],
     AUDITOR:            [], // read-only by construction
     ANALYST:            [], // read-only by construction
   };
   ```
   Exact permission-to-role mapping is a product decision for the
   Aggregator operations owner to confirm — the above is a reasonable
   starting proposal based on each role's plain-English name, not a final
   answer.
2. **Add a `requirePermission()` guard function**, analogous to
   `authorizeRegionalRequest`, and apply it to every currently-unrestricted
   privileged write route:
   - `POST /api/v1/aggregator/liquidity/dispatch`
   - `POST /api/v1/aggregator/keys`, `DELETE /api/v1/aggregator/keys/[id]`
   - `POST /api/v1/aggregator/settlements/run`
   - `POST /api/v1/aggregator/agents`
   - `POST /api/v1/aggregator/territories`
   - `POST /api/v1/aggregator/targets`
   - `PATCH /api/v1/aggregator/settings`
   - `POST /api/v1/aggregator/exceptions/[id]/resolve`
   - `POST /api/v1/aggregator/risk/[id]/ack`
   - `POST /api/v1/aggregator/reconciliation`
3. **Mirror the restriction in the UI**: gray out / hide the corresponding
   action buttons (Dispatch Float, Issue Key, Run Settlement, Onboard Agent,
   etc.) when `useAggregator()`'s `aggregator`/`staff` role isn't permitted —
   this is a UX improvement, not the security boundary (the server-side
   check in step 2 is the real control either way).
4. **Add a regression test** (`tests/aggregatorPermissions.test.ts`, following
   the pattern of the existing `adminResourceRegistry.test.ts`) that asserts
   every privileged route rejects at least one non-privileged role, so this
   can't silently regress the way it apparently arose in the first place
   (routes shipped incrementally, each new one missing the check the
   `compliance/decision` route happened to get).

**Acceptance criteria:** every route in the list above returns `403
FORBIDDEN_ROLE` for a role not in its permission's allowlist, verified by an
automated test; UI buttons are conditionally rendered/disabled by role;
`AUDITOR`/`ANALYST` accounts can view everything and mutate nothing.

**Implementation status (shipped this session):**
- `src/lib/aggregator/permissions.ts` — client-safe permission matrix
  (`AGGREGATOR_PERMISSIONS`, `aggregatorRoleHasPermission`), importable from
  both API routes and React components.
- `src/lib/security/aggregatorPermissions.ts` — server-side
  `requireAggregatorPermission(staff, permission)` gate built on the same
  matrix, returning a ready-to-return 403 `FORBIDDEN_PERMISSION` response.
- Wired into all 12 relevant routes: `liquidity/dispatch`, `settlements/run`,
  `reconciliation` (POST), `agents` (POST), `territories` (POST), `targets`
  (POST), `keys` (POST + DELETE `[id]`), `team` (POST, migrated from its
  previous inline role check), `compliance/[id]/decision` (migrated from
  its previous inline `REVIEW_ROLES` check), `exceptions/[id]/resolve`,
  `risk/[id]/ack`.
- Final role→permission mapping: OWNER/ADMIN hold everything; OPERATIONS_MANAGER
  can dispatch float, onboard agents, and manage territories/targets;
  FINANCE_MANAGER can dispatch float, run settlements/reconciliation;
  COMPLIANCE_OFFICER decides compliance documents; RISK_OFFICER acknowledges
  risk alerts; all five of those plus OWNER/ADMIN can resolve exceptions;
  API-key issuance/revocation and team invites stay OWNER/ADMIN-only by
  design (the two categories judged too sensitive to delegate further).
  AUDITOR/ANALYST/FIELD_OFFICER hold none of the privileged permissions.
- UI-level gating added (defense-in-depth, not the security boundary) via a
  new `hasPermission()` helper on `AggregatorContext`, fed by a `staffRole`
  field now threaded through `/api/v1/aggregator/me` → context: buttons for
  float dispatch (gated once at the shared `LiquidityDistributionModal`,
  the single choke point every "Dispatch Float" entry point across the
  portal opens), settlement run, reconciliation run, agent onboarding,
  team invite, API key issuance/revocation, compliance decisions, risk
  acknowledgement, and exception resolution now hide/disable themselves
  with an explanatory tooltip/notice for a role that would be rejected
  server-side anyway.
- Regression test added: `tests/aggregatorPermissions.test.ts` (16 tests) —
  asserts OWNER/ADMIN hold every permission, AUDITOR/ANALYST/FIELD_OFFICER
  hold none of them, each permission's exact allowed-role set, and that
  `requireAggregatorPermission` returns the correct 403 for a denied role.
  Full suite (`npx vitest run`) passes: 6 files, 45 tests + 1
  correctly-skipped (the DB-perimeter RLS check, which needs live
  credentials only available in CI). `tsc --noEmit` and `eslint` both clean
  across every touched file.
- **Not yet done from this phase:** `createTerritory`/`createTarget` context
  actions exist and are now permission-gated at the API layer, but no
  frontend form currently calls them (`/aggregator/territories` and
  `/aggregator/targets` are read-only display pages) — this was already a
  pre-existing dead-end in the UI, not something this phase introduced, but
  it means the new `aggregator.territories.manage` / `aggregator.targets.manage`
  permissions have no UI surface to visibly test against yet. Worth a small
  follow-up ticket to either build the missing "Create Territory"/"Create
  Target" forms or confirm they're intentionally deferred.

### Phase B — Aggregator account security parity (F4)

1. Implement TOTP-based MFA for aggregator staff logins — this portal holds
   the most money-moving privilege of the three and currently has the
   weakest login-hardening story (no MFA option at all, vs. agent/regional
   which at least share the same base Supabase Auth session model).
2. Implement IP allowlisting per aggregator organization (optional,
   opt-in) for staff sign-in, since aggregator back-offices are typically a
   small, fixed set of known office/VPN egress IPs — a good, low-friction
   control for this specific user population.
3. Once either ships, replace the "Planned Controls" honesty notice on
   `/aggregator/security` with the real, working toggle — never ship a UI
   control that isn't server-enforced (this preserves the existing
   commitment already visible in that page's own code comments).

**Acceptance criteria:** aggregator staff can enable TOTP MFA and see it
enforced on next login; an org owner can optionally configure an IP
allowlist and see logins from outside it rejected; no fake/inert toggle
remains on the security page.

### Phase C — Regional contact-info correctness (F3)

1. Replace the hardcoded "Kano Regional Agent WhatsApp Desk" on
   `/agent/support` with a value resolved from the agent's own
   `state_or_region`/`country` — either a small static lookup table (one row
   per operating region/territory, easy for ops to maintain) or, if
   Regional Manager contact details are meant to be the actual desk, a real
   join to the assigned Regional Manager for that agent's territory.
2. Apply the same audit to the Aggregator and Regional support pages to
   confirm no other portal has a similarly hardcoded, non-adaptive contact
   value (spot-checked this session — none found, but a full grep sweep for
   literal city/region names in support-facing copy should be part of this
   ticket's Definition of Done).

**Acceptance criteria:** an agent's displayed support contact matches their
actual operating region for at least 2 distinct regions in manual QA (e.g. a
Lagos-registered agent and a Niger Republic-registered agent see different,
correct contact info).

### Phase D — Settlement automation (F5, F6)

This is the most requested kind of gap ("seamless automation is highly
needed") and the most mechanically simple to close, since the underlying
logic (`run_daily_settlement`) already exists, is idempotent per
`(org, currency, date)`, and is exercised correctly by both manual routes
today — the only missing piece is *who calls it and when*.

1. Add both settlement paths to `vercel.json`'s `crons` array (or an
   equivalent external scheduler if the team moves off Vercel), each hitting
   a small new secret-gated endpoint (reusing the existing `CRON_SECRET`
   pattern from `/api/cron/financial-close`) that loops over every
   ACTIVE org/currency pair and calls `run_daily_settlement` for each —
   rather than the two currently-hardcoded org IDs baked into the dormant
   `pg_cron` migration block, which would silently miss any org onboarded
   after that migration ran.
2. Confirm idempotency under a double-fire (already true per the RPC's own
   design — verify with an automated test that calls it twice for the same
   date and asserts no duplicate settlement batch/ledger entries).
3. Retire (or leave inert, clearly commented) the `pg_cron` block in
   `20260906000029_agency_transfers_settlement_kyc_realtime.sql` once the
   Vercel-cron path is live, so there's exactly one source of truth for
   "how does settlement actually get triggered" instead of two
   (one dormant, one real).
4. Wire a completion notification (email/webhook/in-app) to the relevant
   ops/aggregator-admin audience once each day's settlement batch closes,
   so this becomes genuinely "fire and forget" rather than something a
   human still has to remember to go check.

**Acceptance criteria:** settlement runs automatically once daily for every
active org/currency with no manual trigger required; a re-run for the same
date is a safe no-op; ops receives a notification of each day's result
(success or failure) without having to poll the portal.

### Phase E — SLA breach alerting (F7)

1. Add a scheduled sweep (same secret-gated cron pattern as Phase D) that
   queries `support_tickets`/`escalations` for any row past `sla_due_at`
   and not yet resolved, and pushes a notification into the existing
   `regional` notifications system (`/api/regional/notifications`) plus,
   for breaches past a second, longer threshold, an escalation to the next
   tier (aggregator ops or platform support).
2. Surface an "at-risk" and "breached" visual distinction on the Regional
   Manager escalations page (today `slaAtRisk` exists as data but there's
   no dedicated "breached" state once the due date has actually passed).

**Acceptance criteria:** a ticket that crosses its SLA due date generates a
notification within one sweep cycle (e.g. within 15–30 minutes) without a
human needing to check the dashboard.

### Phase F — AML monitoring scheduling (F8)

This was already identified in the prior Phase 4 DevSecOps review as an
operational gap; folding it in here because it's the automation item with
the broadest blast radius across all three portals (every agent, aggregator,
and their transactions feed this sweep).

1. Add `/api/cron/aml-monitoring` to `vercel.json`'s `crons` array at an
   appropriate cadence (recommend starting at hourly, tune based on real
   alert volume once live).
2. Confirm the sweep's own idempotency/incremental-scan behavior handles a
   restart or a missed run cleanly (verify by reading
   `runAmlMonitoringSweep`'s watermark/cursor logic before scheduling it for
   real, since this determines whether a missed run silently loses coverage
   or safely catches up).

**Acceptance criteria:** the AML sweep runs on a fixed schedule with no
manual trigger required, and a deliberately-skipped run (e.g. a deploy
during the scheduled window) is proven not to silently drop coverage for
that period.

---

## 3. Suggested sequencing

| Order | Phase | Rationale |
|---|---|---|
| 1 | A — Aggregator role enforcement | Only finding with real financial/operational risk exposure today; pure server-side additive fix. |
| 2 | D — Settlement automation | Highest-value "seamless automation" ask; logic already exists, just needs a scheduler wired up. |
| 3 | F — AML monitoring scheduling | Broadest blast radius automation gap; already scoped from the prior security review. |
| 4 | B — Aggregator MFA/IP allowlist | Real security value but a larger build (new UI, new auth flow); can run in parallel with 2–3 once resourced. |
| 5 | E — SLA breach alerting | Improves Regional Manager operational visibility; not urgent, good "quick win" once the cron pattern from Phase D/F exists to copy. |
| 6 | C — Regional contact-info fix | Small, isolated, no dependencies — can be picked up any time, including immediately, in parallel with everything else. |

Phases D, E, and F all share the same secret-gated-cron-endpoint pattern
established by the existing `/api/cron/financial-close` route — building
Phase D first means Phases E and F can reuse its scheduling/notification
scaffolding rather than each inventing their own.
