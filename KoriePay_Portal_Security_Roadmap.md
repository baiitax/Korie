# KoriePay Portal Review — Security, Dead Connections & Automation Roadmap

**Scope:** customer portal (`/customer`), compliance portal (`/compliance`), support portal (`/support`) — pages, session gates, API routes, DB functions they reach, and the automation between them.
**Method:** full static read of the three portals' pages/components/libs against the live route inventory and the production database (grants, RLS, function security attributes); reachability probes executed against the real Supabase PostgREST endpoint with the public anon key; no fabricated test data posted.
**Date:** 2026-09-16. **Status: DO-NOT-LAUNCH stands.**

---

## Part 1 — What is already solid (do not re-litigate)

| Control | Evidence |
|---|---|
| Every page behind a real session gate | `ComplianceSessionGate` / `AdminDataGateway`-style gates on all three portals; nothing portal-looking renders before a verified Supabase session and role check |
| Every customer API route is owner-scoped | All `/api/customer/*` routes call `authenticateCustomerRequest`; identity comes from the token, never a client-supplied id (verified per-route, zero exceptions) |
| Support console PII handling | Customer 360 masked by default, `unmask` is a separate capability, every unmask is audited with jurisdiction |
| Support refunds surface is read-only | `/api/support/refunds` GET only; decisions flow through the engine |
| Registration/contact/newsletter rate-limited | Per-route limits present |
| Money movement elsewhere is dual-controlled | B8/H.16: settlements, reversals, adjustments, write-offs, payouts — all maker-checker |
| Support portal is genuinely live | Tickets, disputes, escalations, knowledge, macros, tasks, retained modules, analytics — all on real `support_*` tables; legacy pages are honest redirects, not dead ends |
| Compliance portal is 32/35 live | Real resources via `/api/compliance/data/*` with a role-gated readable set |

---

## Part 2 — Findings register

### CRITICAL / P0

**PS-1. SECURITY DEFINER money function was executable by `anon` — confirmed, and fixed today (day-0).**
`public.post_dispute_resolution(p_dispute_id, p_decision_type, p_officer_id, p_reason, p_partial_amount)` is `SECURITY DEFINER`, EXECUTE granted to `anon` + `authenticated` (Supabase default privileges; `REVOKE FROM PUBLIC` does not remove direct grants), takes the officer id as a **caller-supplied parameter with no caller verification**, and posts a real journal **crediting the customer's wallet** (locks the wallet row, clears or suspends, writes `ledger_transactions`).
Reachability was **proven, not theorized**: an anon-key call to `/rest/v1/rpc/post_dispute_resolution` executed the function body and returned a domain error (`Dispute … not found`) — past auth. With any real PENDING dispute id (customers open disputes on their own transactions through the portal), an attacker holding only the public anon key could credit the disputed wallet — a self-serve refund without any officer involved.
Same exposure on: `record_dispute_non_financial_decision` (falsify dispute decisions/audit with an arbitrary officer id), and — from this week — `open/run/prepare/review_month_end_close*` (forge close records with arbitrary actor emails). The M12 maker-checker RPCs were **not** exposed (SECURITY INVOKER + RLS with no policies = fail-closed).
**Fix applied 2026-09-16** (migration `20260914000061`, applied before commit): `REVOKE EXECUTE … FROM anon, authenticated, PUBLIC` on all six, `GRANT … TO service_role`. Post-fix probes return `42501 permission denied`. The app is unaffected (it calls these via the service-role admin client only).

**PS-2. Financial dispute decisions are single-officer — the last one-person money path.**
`decideDispute` in `SupportOpsEngine` posts `REFUND_APPROVED` / `REVERSAL_APPROVED` / `PARTIAL_REFUND` straight to `post_dispute_resolution` on one officer's decision (only guard: the decider's *role* must match `decision_owner`). No maker-checker, no second pair of eyes. Everything else that moves money now requires two distinct people (B8/H.16). The PS-1 fix stops *anonymous* abuse; it does not add dual control for a legitimate-but-rogue or compromised officer account. **This is the highest-priority open item.**

### HIGH / P1

**PS-3. The anon-grant pattern will recur — no guardrail.**
Root cause of PS-1: Supabase's default privileges grant EXECUTE on every new function to `anon`/`authenticated` directly. Nothing in the repo fails a migration that creates a `SECURITY DEFINER` function without an explicit revocation. `hook_password_verification_attempt` is *still* granted to anon (it is an auth-service hook; revoking needs a GoTrue behavior verification first — flagged, not blindly touched).

**PS-4. Surveillance and SLA automation are not running: `CRON_SECRET` unset, AML sweep unscheduled.**
`vercel.json` schedules only `/api/cron/financial-close`. `/api/cron/aml-monitoring` exists, correctly refuses to run without `CRON_SECRET` (fail-closed — good), and therefore **never runs**: AML sweeps are manual-only today. The standing blocker (dead Vercel token) has prevented setting the secret. Separately, support SLA breach detection is **lazy** — `sweepSlaEvents` fires only when a ticket is touched; an unopened breached ticket never notifies anyone.

**PS-5. Three compliance pages render fabricated data — on the compliance console.**
- `/compliance/analytics` — hardcoded KPIs ("Case Conversion Rate 28.4%", "Mean SLA 18.2 hrs", "Sanctions False Positive Rate"…) with no data source behind them.
- `/compliance/transaction-monitoring` — a hardcoded fake telemetry feed (invented customer names, transaction ids, risk scores) presented as a live monitoring screen.
- `/compliance/regulatory-reporting` — mock reports list, while the real `regulatory-reports` / `regulatory-obligations` resources already exist in the readable set and are simply not wired.
These three pages still import the legacy mock `ComplianceContext` (whose "current officer" is a hardcoded person) backed by the 634-line mock store in `complianceDataService.ts`. A compliance officer making decisions off this screen is making them off fiction.

### MEDIUM / P2

**PS-6. Support → compliance escalation is a label, not a hand-off.**
Escalating a ticket to `COMPLIANCE` / `FRAUD_RISK` transitions the ticket and writes a support escalation row — and creates **nothing** in the compliance portal (no case, no alert, no notification to any compliance officer). Cross-portal work relies on someone happening to look.

**PS-7. Customer portal incomplete pages / dead ends.**
- `/customer/bills`, `/customer/cards`, `/customer/payments` — `ComingSoonCard` placeholders in active navigation.
- `/customer/fund` — static bank-transfer instructions + `window.print()`; no funding intent is recorded, so a customer who actually wires money leaves no system trace to reconcile against (B4 makes the gateway itself blocked, but the intent + reference is not B4-blocked).
- `/customer/settings`, `/customer/security` — honest read-only states (good), language selection is client-side only.

**PS-8. Customer "support" is disputes-only.**
The support form POSTs to `/api/customer/portal/disputes` with a fixed category set (`FAILED_TRANSFER`, `DUPLICATE_DEBIT`, …, `OTHER`). A customer with a non-dispute question ("how do I…?") must file it as a dispute; the full ticket module in the support console is unreachable from the customer side.

**PS-9. Dispute lifecycle has no aging automation and no customer notification on decision.**
Open disputes do not auto-escalate with age; when an officer decides a dispute/refund, the customer is not notified (they must re-open the screen); the support side has SLA automation for tickets but none for disputes.

**PS-10. Session/token hardening gaps.**
Supabase sessions live in browser `localStorage` (supabase-js default) across all portals — an XSS anywhere tokenizes the session; no strict CSP is enforced app-wide; the admin console persists an email hint in `localStorage`. (The parallel security stream's header/session hardening helps; this tracks the remainder.)

### LOW / P3

**PS-11. Composable minor items.** Compliance customer views: verify PII-masking parity with the support console's unmask-capability + audit model. Maker-checker queues: no reminder loop for pending requests (aging only surfaces in the daily close). Month-end close: the real September close needs a calendar trigger (ops discipline or an Oct-1 cron).

---

## Part 3 — Implementation roadmap

Sequencing rule: **P0 controls first, then truth (no fabricated screens), then automation, then completion.** Each phase has acceptance criteria that gate the next. Estimated efforts are focused engineer-days (ED) assuming the existing codebase conventions (migrations + `authorize*Request` + maker-checker patterns) are followed.

### Phase 0 — Day-0 containment (DONE, 2026-09-16)

| Item | Status |
|---|---|
| Revoke `anon`/`authenticated` EXECUTE on the six exposed `SECURITY DEFINER` functions; keep `service_role` | ✅ Applied (migration `20260914000061`), anon probes now `42501` |
| Verify the app is unaffected | ✅ App calls these only via the service-role admin client |

### Phase 1 — Close the P0s (Week 1, ~6–8 ED)

**1.1 Dual-control for financial dispute decisions (PS-2) — the keystone.** ✅ **DONE (2026-09-16, migration 20260914000062 + app layer).**
- **Status:** live in prod. DB: `DISPUTE_FINANCIAL_DECISION` action type, `submit_dispute_decision` + `decide_dispute_decision` (service_role only, anon/auth revoked), close v7 orphan check now links `support_disputes.recovery_case_reference`. App: financial decisions submit → `PENDING_CHECKER_APPROVAL`; new `/api/support/approvals` queue + "Checker queue" tab on Refunds & Reversals; pending-approval banner on the dispute page; checker = decision-owner roles + SUPPORT_SUPERVISOR (check-only); REJECTED/UNDER_INVESTIGATION stay single-officer (explicit policy decision — documented, no money moves).
- DB migration: add `DISPUTE_FINANCIAL_DECISION` to `maker_checker_requests.action_type`; new `submit_dispute_decision` + `decide_dispute_decision` RPCs following the M12 pattern exactly: submit validates the dispute is PENDING + financial-decision payload (type, reason, partial amount capped server-side) + maker identity; decide refuses self-approval (id AND email), executes `post_dispute_resolution` **inside the approval transaction** (failure rolls back, request stays PENDING), writes `control_approval_events` + audits with `MCM-` correlation.
- App: support console's decision button becomes a submission (`PENDING_CHECKER_APPROVAL`); a second officer (different person) approves/rejects in a queue surface — extend the support console's disputes view with the checker step, and/or add the type to `/api/admin/approvals` + ops approvals.
- Convert `record_dispute_non_financial_decision` to the same checked flow (REJECTED / UNDER_INVESTIGATION can stay single-officer if policy accepts it — decision to make explicitly, not by omission).
- **Acceptance:** committed e2e — officer A submits refund, A cannot approve it, officer B approves → wallet credited exactly once with audit chain; a rejected request leaves balances untouched; probe matrix for all guards. **→ MET.** Committed e2e on DSC-2026-0035: Femi (TIER_3_FINANCE) submitted PARTIAL_REFUND 2,000 XOF → self-approval refused → Haruna (SUPPORT_SUPERVISOR) rejected (nothing moved) → resubmitted → Haruna approved → `DRC-20260916-c86036f97b` posted balanced (DEBIT CLEARING-NE-CORIS-XOF / CREDIT customer wallet), wallet 382,750 → 384,750, checker recorded as the posting officer, `control_approval_events` ×2 + `audit_events` ×4 with `MCM-` correlations, second decision refused (`DISPUTE_ALREADY_DECIDED`), close v7 re-run: `orphan_ledger_transactions` 0, `maker_checker_pending` 0. Full rollback probe matrix passed pre-commit (self-approval, TIER_1 maker/checker, short reason, non-financial type, duplicate pending, already-decided). Known unprobeable-until-eligible-fraud-maker-exists: `DISPUTE_TRANSACTION_NOT_FOUND` + txn-level pending/resolved guards (RBAC eligibility fires first — deliberate guard order; DSC-2026-0036 has no eligible maker today).
- **Ops note:** no eligible checker for fraud-owned disputes exists beyond SUPPORT_SUPERVISOR — ensure at least one SUPPORT_MANAGER/SUPER_ADMIN is staffed for resilience.

**1.2 Verify + fix the auth hook grant (PS-3, part).** Confirm `hook_password_verification_attempt` is invoked by the auth service under its own role, then revoke `anon`/`authenticated` EXECUTE. Needs one successful manual login test after (out-of-band credentials — see dependencies).

**1.3 Make the cron surface real (PS-4).** Set `CRON_SECRET` in Vercel (blocked on a fresh token from you — the standing blocker), add to `vercel.json`: `aml-monitoring` (hourly), an `sla-sweep` (15 min) that runs the existing `sweepSlaEvents` logic across ALL open tickets (move the loop server-side), and dispute-aging sweep (hourly, Phase 3 uses it). Until the token arrives, document the manual operator trigger as the interim.

**1.4 CI guardrail so PS-1 cannot recur (PS-3).** ✅ **DONE (2026-09-16, commit 5fb3e59).**
- **Status:** live. `scripts/lint-migrations.mjs` runs in CI (own step) + vitest: replays every migration modelling real Postgres ACL semantics (fresh CREATE = EXECUTE-to-PUBLIC; OR REPLACE preserves ACL; named/blanket REVOKE/GRANT; ALTER DEFAULT PRIVILEGES), fails on any SECURITY DEFINER function executable by anon/authenticated, on blanket grants and default-privilege grants to anon/authenticated. Single tight allowlist (the auth hook, roadmap 1.2) with reasons; stale allowlist entries fail too. `--live` mode checks actual DB ACLs via psql (operator command — no credentials in a **public** repo's CI). `supabase/migrations/README.md` documents the convention.
- **Bonus finding, fixed same day:** building the live check surfaced six more PS-1-class exposures — `adashi.advance_adashi_cycle`, `create_adashi_cycles`, `generate_adashi_allocation`, `lock_membership`, `liquidity.create/consume_liquidity_reservation` — SECURITY DEFINER, anon+authenticated-executable since 000040, no internal auth checks. Fixed in migration `20260916000063` (revoke anon/authenticated/PUBLIC + explicit service_role grants; the app only ever called them via the server-side admin client). Verified: live lint 0 violations, anon-key RPC probe now PGRST202 not-in-schema-cache. **The only anon/authenticated-executable SECURITY DEFINER function left in the entire database is the auth hook (1.2).**
- A migration-lint script (runs in CI before deploy): fail if any `public` schema function is `SECURITY DEFINER` **and** granted to `anon`/`authenticated`; fail if a new function has no explicit `REVOKE … FROM anon, authenticated`. Plus a repo convention note in the migrations README.
- **Acceptance:** a deliberately-bad test migration fails CI; the current schema passes. **→ MET.** Bad fixtures (unprotected SD function, direct anon grant, blanket grant, default-privileges grant) are permanent vitest cases that must FAIL the linter; the real migration history + live schema pass (CI run 35138344383: all steps green, incl. the new lint step; suite 45/1/0).

### Phase 2 — Truth completion on the compliance console (Weeks 2–3, ~8–10 ED)

**2.1 `/compliance/regulatory-reporting` → live.** ✅ **DONE (2026-09-17, commit 6e26924).** The live register already existed at `/compliance/reports` (reports + obligations + restatements, in the nav, read-only because every regulatory route is GET-only) — the mock screen at `/compliance/regulatory-reporting` was a redundant duplicate showing invented filings with a fake "Dispatch Filing" button. Retired: the route now redirects to the live register; bookmarks still work.

**2.2 `/compliance/transaction-monitoring` → real telemetry.** ✅ **DONE (2026-09-17, commit 6e26924).** Two live reads: open `aml-alerts` (scenario, severity, what happened, why suspicious, SLA, link to the alert) + the `risk-decisions` stream (decision, composite score, rule hits, latency) with search/decision filters. Refresh button; honest empty states. Current reality renders as-is: 1 alert, 0 risk decisions. (The roadmap's payments/customer-transactions join was dropped — `risk_decisions` already carries the transaction reference and the engine has evaluated nothing yet; joining zero rows to anything is still zero rows. Revisit if/when the engine runs.)

**2.3 `/compliance/analytics` → computed metrics.** ✅ **DONE (2026-09-17, commit 6e26924).** New `GET /api/compliance/analytics`: alert→case conversion (aml_alerts.case_id), mean case resolution hours (aml_cases created_at→closed_at), screening volume + match count (audit_events AML_SCREENING_RUN, 30-day window), overdue statutory obligations (regulatory_obligations), per-jurisdiction exposure (aml_cases), alert severity/status distributions. Every KPI ships numerator/denominator + the query it traces to. Sanctions false-positive rate honestly NOT_ASSESSED (no table records match dispositions — noted as a prerequisite). The four invented KPIs ("28.4%", "18.2 hrs", "62.5%", "99.4%") are gone.

**2.4 Delete the mock layer.** ✅ **DONE (2026-09-17, commit 6e26924).** Deleted with grep-verified zero importers: ComplianceContext, complianceDataService.ts (634 lines), demo store/fixtures/toRows, the dead ComplianceShell + 5 orphaned modal components, the demo-fallback machinery in service/hooks/mutations, and the ComplianceProvider layout wrapper. No fixture substitution is possible anymore — a failed live read fails honestly. The watchlists catalog remains as clearly-labelled static configuration (real list names, NOT_CONNECTED). −3,932 lines, +1,245.

**2.5 PII masking parity (PS-11).** ✅ **DONE (2026-09-17, commit 6e26924).** identity-persons rows (list + record) now leave the compliance data plane with email/phone/date-of-birth masked SERVER-side — previously raw PII went to any compliance-read session. `?unmask=1` requires a compliance write role (SUPER_ADMIN / ORGANIZATION_OWNER / ORGANIZATION_ADMIN / COMPLIANCE_OFFICER — 403 FORBIDDEN_UNMASK otherwise) and writes a PII_UNMASKED audit row, exactly the support console's Customer 360 model (spec §55). The customer file has a capability-gated "Reveal PII" action with an audited-view notice. aml_customer_profiles checked: no direct PII fields (risk attributes only).

- **Acceptance:** the three pages render only real rows (verified against DB counts); the mock store is gone from the build; tsc/vitest green. **→ MET (2026-09-17).** DB truth at ship time: 1 aml alert, 1 aml case (open, NG, no closed cases → resolution honestly NOT_ASSESSED), 0 risk decisions, 3 audited screening runs, 5 obligations — exactly what the pages render. Mock store grep-verified gone; tsc/eslint/vitest 45-1-0/i18n parity 3161 green; CI run 35168743768 all steps green; deployed + verified in prod (redirect live, /api/compliance/analytics live behind the auth gate). UI-level authed click-through still blocked on compliance credentials (rotated).

### Phase 3 — Cross-portal automation (Weeks 3–4, ~8–10 ED)

**3.1 Escalation bridge (PS-6).** ✅ **DONE (2026-09-17, commit c4cbca9).** Escalations to COMPLIANCE/FRAUD_RISK create a real `aml_alerts` referral row (scenario SUPPORT_ESC_01, explicitly "officer referral, not engine-detected") linked both ways: `support_escalations.external_ref` = alert reference, `aml_alerts.source_reference` = escalation number (UNIQUE index = hard idempotency; a rollback probe proved duplicate inserts are rejected). The compliance bell derives referral notifications from the real rows — bridged ones point at the alert, un-bridged ones say so (a visible gap, not a blank). Ticket timeline gets ESCALATION_BRIDGED / ESCALATION_BRIDGE_FAILED events; the hourly sweep retries un-bridged escalations (self-healing). Support console shows the linked alert on the escalation detail. Design deviation from the roadmap's "risk_cases or aml_alerts": both destinations file an aml_alerts row — the compliance console's case queue is `aml_cases` (checked enum: status/jurisdiction constraints make auto-filing cases there lossy), and an officer converts an alert to a case through the console's existing action when triage says so. A real PENDING COMPLIANCE escalation (ESC-2026-0047, ticket KP-SUP-10523) is staged for the first live sweep run.

**3.2 Dispute-decision event → customer notification (PS-9).** ✅ **DONE (2026-09-17, commit 6842abc).** The bell existed but NOTHING in the codebase ever wrote to customer_notifications — it was a bell that could not ring. Non-financial decisions notify at decide-time; financial decisions notify on checker approval, built from the approval RPC's own return (posted_amount/posted_currency/recovery_reference — what the ledger actually posted, never the claim amount). Checker REJECT tells the customer nothing (still undecided). Wording pinned by tests: outcome + references + posted amount only — never officers' internal reasoning. Category SUPPORT/VERIFICATION fit the existing closed enums (a rollback probe caught the DISPUTE category CHECK before it shipped — no schema change needed).

**3.3 Aging automations.** ✅ **DONE (2026-09-17, commit 5e48a0d).** Hourly /api/cron/support-sweep, every pass idempotent (ladder fixpoints, checker_reminded_at, task source_ref dedup, SLA event guards). Honest gaps, reported not papered over: (a) money-movement maker-checker requests >24h are counted in the sweep report but NOT notified — the admin console has no notification bell, and notifying into a surface that does not exist would be theater (needs an admin bell — new item below); (b) no customer_kyc_documents row has expires_at set today, so the KYC pass runs and honestly finds nothing (upload flows never populate it — noted for the KYC stream). Dry-run against production pinned the first run: 11 open tickets SLA-swept, 1 dispute bumped (DSC-2026-0036 HIGH→URGENT, 254h; DSC-2026-0037 already URGENT = fixpoint), 0 pending >24h requests, 1 un-bridged escalation to bridge.

**3.4 SLA sweep operational (from 1.3).** ✅ **CODE DONE (2026-09-17, commit 5e48a0d); operationally blocked on the 1.3 env var.** engine.sweepOpenTicketSlas() evaluates every open ticket each run (previously SLA events fired only when a ticket happened to be read/transitioned); sweepAutoClose moved to the cron and reports its count; every run writes a SUPPORT_AGING_SWEEP audit row with the full report (the liveness trail Phase 5 needs). ⚠️ **CRON_SECRET is not set in production** (verified live: the financial-close cron returns CRON_NOT_CONFIGURED — the existing DAILY_FINANCIAL_CLOSE audit rows come from the month-end workflow, not the cron). Until ops sets CRON_SECRET in Vercel, the sweep is deployed but dormant, and the acceptance demo below cannot run. Setting it is a one-line env-var change.
- **Acceptance:** end-to-end demo of each automation on production data (create → sweep → notification visible in the target portal), with idempotency probes (double-run creates one row). **→ Partially met:** idempotency proven at the DB level (unique-index probe, event guards, ladder fixpoints) and by unit tests; migration + queries verified against production with a pinned dry-run; the create→sweep→notification loop awaits CRON_SECRET (ops) and staff credentials (rotated) for the officer-driven paths.

**New gap found while building 3.3:** the ADMIN console has no notification bell — money-movement maker-checker requests aging >24h can be counted and reported by the sweep but have nowhere to ring. Build an admin notifications surface (or route those reminders to a channel that exists) before the money-movement aging reminder can honestly claim to "notify".

### Phase 4 — Customer portal completion & session hardening (Weeks 4–6, ~10–14 ED, partly partner-blocked)

**4.1 Decide bills/cards/payments honestly (PS-7).** Recommend: **remove from navigation until a bill-payment partner is signed** (consistent with the no-fabrication posture — a ComingSoon card is marketing, not banking), or build the scoped MVP if a partner exists. Decision required from product owner.

**4.2 Fund page leaves a trace (PS-7).** On "I have sent the funds", record a pending funding intent (reference + amount + channel) so that when B4 statement ingestion lands there is something to match against; keep the static instructions meanwhile.

**4.3 Real support tickets for customers (PS-8).** Either a guided entry that separates "question" (→ ticket module, visible to support console) from "transaction problem" (→ dispute), or a general `INQUIRY` ticket type. Keep disputes strictly financial.

**4.4 Session hardening (PS-10).** Strict CSP (+ frame-ancestors, no unsafe-inline where feasible), review token lifetimes, evaluate cookie-based session strategy for staff portals, remove the localStorage email hint on admin. Coordinate with the parallel security stream to avoid double-work.
- **Acceptance:** no placeholder pages in nav (or explicitly product-approved); funding intent e2e; CSP headers verified; auth flows regression-tested.

### Phase 5 — Operational cycles & verification (ongoing)

- Real month-end close for September (Oct 1) on the new checklist workflow — first of the two required cycles.
- External pen-test pass over the three portals **including the PostgREST RPC surface** (PS-1 was found by exactly that lens).
- Monitoring/dashboards on cron liveness (last-run timestamps), queue depths (maker-checker, disputes, escalations), and the daily close exception count.

---

## Part 4 — Dependencies, honest limits

1. **CRON_SECRET + Vercel deploys need a fresh Vercel token from you** (the old one is dead server-side). Until then, 1.3 ships code but automation stays manual-trigger.
2. **Authenticated portal e2e needs out-of-band staff credentials** — all 10 passwords were rotated by the parallel security agent; new passwords exist only in that agent's sandbox. Several acceptance items (1.2, 4.4) require a real login.
3. **Bank rails (B4) still gate**: real bill payments, card products, gateway funding, statement-matched bank rec. The roadmap deliberately builds only the non-blocked parts (intent capture, honest removal).
4. **Dual-control for dispute refunds changes an operational workflow** — support managers should sign off that two-person refund approval is acceptable for their SLAs (recommended: allow SUPPORT_MANAGER single-officer only below a small threshold, mirroring the payout-threshold pattern — an explicit policy choice, not a default).
5. Estimates assume one engineer familiar with the codebase; the DB work in Phase 1 follows patterns that are already proven (M12), which is why it is small relative to its impact.

---

*Prepared as part of the ongoing independent review program. Day-0 fix (migration `20260914000061`) applied to production and verified before this document was written. This is an engineering-readiness review, not a legal or audit opinion.*
