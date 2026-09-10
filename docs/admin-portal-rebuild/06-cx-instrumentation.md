# 06 — GAP-2 remediation: the customer-experience loop, instrumented

Status: **IMPLEMENTED + GATES GREEN + LIVE-VERIFIED** (prod build on :3000) · Date: 2026-09-10 · Branch: `feature/compliance-portal-demo-rebuild`

## What was asked (verbatim)

> **GAP-2 · No customer-experience instrumentation anywhere — CRITICAL**
> `grep -ril "csat|nps|satisfaction|survey" src/lib src/app/admin` → **zero results**. For a payments firm, the closed
> loop (complaint → fix → measure → prevent) is the CX core. The engine side actually has the instruments — complaint
> priorities P0–P3 with 24–72h SLA clocks, `isSlaBreached`, dispute/chargeback/refund engines with a **real
> double-entry financial-redress journal** (expense 5010 DR → customer wallet CR) — yet no admin surface exposed
> them coherently.

The grep was right, and worse than it looked: not only was there no CSAT surface, there was **no way for a customer to
express satisfaction at all**. A "satisfaction score" anywhere in this product would have been invented. So the work
was two-sided: expose the instruments that existed, and build the measurement that did not.

## The five stages, and where each one's numbers come from

| Stage | Reads | Engine method it calls |
| --- | --- | --- |
| **1 Capture** | complaint book, priorities, categories, disputed value, exposure | `ComplaintDisputeEngine.getComplaints()` |
| **2 Resolve** | SLA clocks (P0 24h · P1 48h · P2 72h · P3 120h), breach state, cycle time, reopens | `computeBreach` + `statusHistory` |
| **3 Redress** | compensation cases, account **5010** postings, refunds, disputes, chargebacks, held reserve | `GeneralLedgerEngine.getJournals()` + recovery engines |
| **4 Measure** | CSAT, distribution, satisfied %, NPS, coverage | `ComplaintDisputeEngine.captureCsat()` + `getCsatResponses()` |
| **5 Prevent** | recurrence clusters (category × agent/terminal), systemic harm incidents | `CustomerHarmIncidentEngine` create/update |

New surfaces: **`GET /api/admin/cx/overview`** (one snapshot), **`POST|PATCH /api/admin/cx/incidents`** (prevention),
**`POST /api/customer/portal/csat`** (capture), **`/admin/cx`** (console page), plus a rating control on the customer's
own case list in `/customer/support`.

## The measurement that did not exist, built honestly

`captureCsat` stores `csatScore` (1–5), comment, channel and timestamp on the complaint record. The rules are enforced
in the engine *and* the route, and each one is a refusal rather than a silent default:

- **only the customer the case belongs to** can rate it (`403 CASE_NOT_FOUND` — deliberately 403, so the portal cannot
  be used to probe case ids);
- **only after RESOLVED/CLOSED** (`409 CASE_NOT_RESOLVED`) — you cannot rate a case nobody has worked;
- **once only** (`409 ALREADY_RATED`) — a second submission never overwrites the first answer;
- **1–5 integers only** (`422 INVALID_SCORE`).

Until a real customer submits a rating the console reports `AWAITING_FIRST_RESPONSE` with *"not measurable — 0 of N
resolved case(s) rated"*. It never shows 0.0, a target, a benchmark, or a line drawn through an empty chart. Coverage is
reported next to the score, and below 20 % coverage the snapshot raises a warning.

## Findings fixed while building this (each was a real truth defect)

1. **`isSlaBreached` had no writer.** The field existed on every complaint, was seeded `false`, and no code path ever
   updated it: `transitionStatus` did not touch it and nothing else did either. Two shipped surfaces read it — the
   Service & Recovery Desk tile and the Executive Overview pulse — so "SLA breached: 0" was *structurally guaranteed*
   regardless of reality. Breach is now computed from `slaDueAt` on every read (`computeBreach`), with closed cases
   judged at the moment they were resolved rather than against today's clock; `refreshSlaClocks()` persists it and
   returns how many stored values disagreed. Both shipped surfaces were moved onto the computed state.
2. **Operator notes were discarded.** `transitionStatus(id, status, notes, assignedToEmail)` accepted `notes` and never
   stored it — every triage note an operator typed was thrown away. Transitions are now recorded in `statusHistory`
   (`status`, `at`, `notes`, `by`), which also makes cycle time and reopens *measurable* rather than assumed.
3. **Intake let a client manufacture the measurement.** `POST /api/complaints` spread the request body into the record
   with `...data`, so a caller could post `csatScore: 5`, `isSeed: true`, `status: 'RESOLVED'`, a pre-dated `slaDueAt`
   or a `financialCompensationAmount` and have the CX console report it as a customer's reality. The route now
   whitelists and validates (country, category, currency, description length, priority), and the engine rebuilds the
   record field-by-field instead of spreading. Verified live: the injection attempt is stored as a plain `OPENED` case
   with a real clock and no measurement fields.
4. **Mixed-currency exposure.** The executive pulse summed NGN and XOF disputed amounts and printed one symbol in front
   of the total. Now reported per currency.
5. **A mitigated incident counted as active harm.** `MITIGATED` incidents were counted as "open", so 42 customers from
   an already-remediated event were reported as currently exposed. Prevention now reports **active / mitigated /
   closed** separately, with affected-customer and exposure figures scoped to active incidents only.
6. **Seed fixtures were indistinguishable from customers.** All four engines seed demo records. They now carry
   `isSeed`, are counted separately, are labelled in the UI, and are named in a warning (`2 of 7 case(s) … are engine
   seed fixtures`). This follows the `isRegistrySeed` precedent from GAP-1's ledger pools.

## Verification transcript (live, prod build, this build)

```
### 1. INITIAL STATE — seeded book, nothing measured, no redress
  captured 2 | live 0 | seed 2 | csat AWAITING_FIRST_RESPONSE | gl5010 postings 0 | median cycle None | clusters 0
  sla policy [('P0', 24), ('P1', 48), ('P2', 72), ('P3', 120)] | {'breached': 0, 'atRisk': 0, 'onTrack': 2, 'metClocks': 0, 'missedClocks': 0, 'storedFlagStale': 0}

### 2. CAPTURE -> RESOLVE -> MEASURE (customer-owned path)
  case A: cmp-900337
  resolved -> RESOLVED | history [('OPENED', None), ('RESOLVED', 'support.lead@koriepay.ng')] | breached at resolution False
  rated 5*
  rate while unresolved: 409 CASE_NOT_RESOLVED
  rate after resolution: 200 → 4
  re-rate case A: 409 ALREADY_RATED
  own-case-only enforcement (another customer's resolved case): 403 CASE_NOT_FOUND
  invalid score: 422 INVALID_SCORE · unauthenticated: 401

### 3. INTAKE INTEGRITY — client tries to inject measurement/lifecycle fields
  stored: status OPENED | csatScore None | isSeed None | slaDueAt 2026-09-13 | compensation None
  verdict: INJECTION DEFEATED

### 4. PREVENT — recurrence cluster -> real harm incident
  incident INC-2026-868 SEV_2_HIGH OPEN | customers 2 | agents 1 | exposure 3000 NGN
  server-recomputed cluster: 2 cases · 2 open · 2 customers · ['CMP-2026-26448', 'CMP-2026-13639']
  transition -> INVESTIGATING by support.lead@koriepay.ng
  raise from a non-repeating key: 409 "Only 0 case(s) match …; prevention incidents require a repeat pattern."
  raise with no actor: 400 ACTOR_REQUIRED · unknown incident: 404 INCIDENT_NOT_FOUND

### 5. REDRESS — compensation through the real double-entry journal
  journal JRN-20260910-6573 | case CMP-2026-26448 -> RESOLVED (FINANCIAL_REDRESS_POSTED)
  compensation with no authoriser: 400 REASON_AND_AUTHORIZER_REQUIRED

### 6. FINAL SNAPSHOT
  headline: 4 open case(s) across 7 in the complaint book; 0 past SLA, 0 inside 4h of deadline. Cycle time median 0m over
  3 resolved case(s). CSAT 4.5/5 from 2 customer rating(s) (66.7% coverage). 1 recurring harm pattern(s) with ≥2 cases
  share a category and agent/terminal.
  loop: captured 7 | open 4 | resolved 3 | resolvedWithRedress 1 | exitRatePct 42.9 | measured 2 | eligible 3
  sla: breached 0 | atRisk 0 | onTrack 4 | metClocks 3 | missedClocks 0 | storedFlagStale 0
  cycle: median 0h | p90 0h | sample 3 | opened 7d 6 | resolved 7d 3 | reopens 0 | no-resolution-type 2
  csat: MEASURED | responses 2 | average 4.5 | satisfiedPct 100 | nps 100 | coverage 66.7% | channels PORTAL 2
        distribution [1★ 0, 2★ 0, 3★ 0, 4★ 1, 5★ 1]
  redress: compensation 1 case ₦5,000 | GL 5010 1 posting ₦5,000 | refunds 1 | disputes 1 | chargebacks 1
  prevention: cluster (AGENT_OVERCHARGING ×2, agent agt-ng-011) | active 1 | mitigated 1
  sources: complaints 7 (2 seed/5 live) · csat 2 live · redressExpense 1 · refunds 1 (1 seed) · disputes 2 (2 seed)
           · incidents 2 (1 seed) · reversals unavailable
```

The compensation is the load-bearing number: the console paid ₦5,000, the ledger posted ₦5,000 to account 5010, and the
journal's `postedBy` is the authoriser the operator typed. Redress figures are therefore *what was posted*, not what a
panel claims was posted. Each engine's series stays separate — a complaint compensation, its refund and its dispute can
describe the same customer harm, and the API says so in a warning rather than adding them up.

Surfaces: `/admin/cx`, `/admin`, `/admin/support`, `/admin/banking-nodes`, `/customer/support`, and
`/api/{admin/cx/overview,admin/overview/executive,complaints,disputes,refunds,bank/v1/liquidity}` all 200.
Gates: `npx tsc --noEmit` 0 · `npx next lint` clean for touched files · `npx next build` ✓ (`/admin/cx` 12.6 kB).

## Still flagged for phased replacement

- **Reversals are withheld.** `RefundReversalEngine` stores reversal records but exposes no read path. The panel says
  so; it does not estimate them.
- **No country dimension on disputes/chargebacks/refunds.** The engines have no country field, so the market filter
  cannot apply to them; the snapshot warns and reports them in full rather than guessing by currency.
- **Resolution type is optional.** The engine does not require one when a case is moved to RESOLVED by a plain status
  change, so two resolved cases in the run above closed with no recorded reason. Surfaced as a counter and a warning —
  it is a product gap, not something the console can fix by inventing a category.
- **Dispute/chargeback/refund books are seed fixtures today**, counted and labelled as such; they become live numbers
  the moment real cases exist in those engines.
- **`adminDataService.ts`** (GAP-1's remaining static layer) is untouched and still feeds
  `/admin/{bdc,merchants,transactions,transfers,wallets}`.

## Runtime note

The complaint, dispute, refund and incident engines are in-process singletons (unlike the `/tmp`-backed ledger store),
so a server restart returns the book to its two seed fixtures and CSAT to zero responses. That is the honest empty
state: an empty measurement is not the same as a zero score, which is exactly why the panel renders "not measurable"
instead of "0.0/5".
