# Super Admin portal — senior fintech consulting review (ecosystem & customer satisfaction)

Date: 2026-09-09 · Branch: `feature/compliance-portal-demo-rebuild`
Role frame: independent fintech consultant, platform-owner lens. The super-admin console is the firm's nervous system: it must let leadership see **the business the way the customer experiences it** — not just volumes and node health. This review maps the surface, separates engine truth from simulation, and fixes the highest-impact customer-satisfaction gaps found.

---

## 1. What the admin portal has (map)

38 sections, incl. deep engine-backed consoles: agents (1,309L), cash-operations (1,344L), treasury, security (PAM/break-glass), risk, ledger, disputes, system-health (circuit breakers/DLQ), intelligence, reconciliation, compliance, kyc. Many pages fetch engine-backed APIs (`/api/agents`, `/api/terminals`, `/api/security/*`, `/api/core/v1/resilience/*`, `/api/v1/treasury/*`, `/api/health` …). It is a *credible command center* on the operations side.

## 2. What a senior fintech reviewer finds deeply missing

### GAP-1 · The executive home is simulation, not truth (trust + decision risk) — HIGH
`CommandCenterOverview` renders from `@/services/adminDataService.ts` — 773 lines of hand-written arrays (banking-node telemetry, exec totals, transactions). The top intelligence strip literally claims "✓ All primary banking nodes (Providus & Coris) operational" from static data. A super-admin console whose headline numbers are canned teaches leadership to trust fiction; every downstream decision (capital calls, node failover, partner escalations) inherits that risk. *Remediated in part this pass; the static panels remain flagged for phased replacement.*

### GAP-2 · No customer-experience instrumentation anywhere — CRITICAL
`grep -ril "csat|nps|satisfaction|survey" src/lib src/app/admin` → **zero results**. For a payments firm, the closed loop (complaint → fix → measure → prevent) is the CX core. The engine side actually has the instruments — complaint priorities P0–P3 with 24–72h SLA clocks, `isSlaBreached`, dispute/chargeback/refund engines with a **real double-entry financial-redress journal** (expense 5010 DR → customer wallet CR) — yet no admin surface exposed them coherently.

### GAP-3 · The support console was fiction while the desk is the CX frontline — HIGH
`/admin/support` rendered **two hard-coded tickets** (`TCK-8812`, `TCK-8813`) that exist nowhere in any engine; the SLA copy was invented. Meanwhile `ComplaintDisputeEngine` (rich lifecycle, SLA, assignment) was only reachable through agent-scoped routes, and its compensation capability (double-entry consumer redress) had **no admin API at all**. Result: a regulator-grade complaint book invisible to ops, and the only redress mechanism uncallable.

### GAP-4 · Fragmented book of work — MEDIUM
Complaints (nowhere in admin), disputes (disputes page), chargebacks and refunds (engine APIs unused by any admin page) lived in four disconnected places with no synthesis: no P0 count, no SLA-breach count, no unresolved-exposure value visible on the home screen for the accountable executive.

### GAP-5 · Merchant & aggregator consoles static; bill-payments shell — MEDIUM (roadmap)
`/admin/merchants` renders a static `MERCHANTS` array; `/admin/bill-payments` and other small shells show placeholder data. Same class of issue as GAP-1 but at section level. (Listed, not remediated this pass.)

### GAP-6 · No feedback culture surfacing — MEDIUM (roadmap)
No complaint-driver analytics (category Pareto over time), no repeat-complainant flagging, no agent-quality linkage (complaints per agent → agent console), no CSAT after resolution. The engine data supports all of these; they need instrumentation + a reporting surface.

---

## 3. Fixes delivered this pass (engine-truth, no fiction)

| Change | Surface | Notes |
|---|---|---|
| **Live engine pulse on the Command Center home** | `src/components/admin/ExperienceHealthPulse.tsx` → inserted in `CommandCenterOverview` | Fetches `/api/complaints`, `/api/disputes`, `/api/chargebacks`, `/api/refunds` at render/refresh: open complaints, P0 count, SLA breaches (of open), open disputes + chargebacks/refunds, unresolved complaint exposure (₦/CFA), plus the top urgent complaints with a direct "Triage →" link. Labeled **live engine pulse**; honors the global country filter. |
| **Admin complaint action API** | `src/app/api/complaints/[id]/route.ts` (new) | `PATCH` = engine `transitionStatus` (whitelisted states; assignment to the service desk). `POST {action: COMPENSATE}` = engine `executeFinancialCompensation` → **real double-entry journal** (consumer-redress expense DR / customer-wallet CR) + subledger move + complaint RESOLVED with GL journal id. |
| **/admin/support rebuilt as Service & Recovery Desk** | `src/app/admin/support/page.tsx` (rewrite) | Engine-backed complaint book (country filter, search, priority & status filters; priority/SLA chips with countdowns and breach states; P0/P1 urgency; customer masked-phone; terminal context) with per-row **Investigate / Resolve / Compensate / Close** actions, plus dispute/chargeback/refund rails and full compensation modal (amount, reason, authorizer). Old two-row fiction deleted. |

## 4. Validation (live prod build)

- `/api/complaints/{id}` PATCH INVESTIGATING → engine status moves with notes + assignment; unknown id → 404 `COMPLAINT_NOT_FOUND`; non-whitelisted status → 400.
- `POST {action: COMPENSATE, amount, reason, authorizedByEmail}` → success returns `journalNumber` from `GeneralLedgerEngine` (GL `KORIE…` journal posted: redress expense DR · wallet CR), complaint marked `RESOLVED`, `glJournalId` + `resolutionNotes` recorded, `financialCompensationAmount` set.
- Admin home renders the pulse with engine counts (2-seed complaint book: 1 P0 investigating, 1 P1 open — SLA clocks live); `/admin/support` 200 with the same book + recovery rails; `tsc`/`next lint`/`next build` clean.

## 5. Honesty & bounds
- The console still contains simulation panels (GAP-1 static layer, merchants, small shells). This pass added a clearly-labeled live rail rather than silently deleting the demo layer; phased replacement is the roadmap.
- Compensation journals use the engine's demo ledger stores (`/tmp`, env-overridable) like every other engine in this repo — real double-entry semantics, sandbox persistence.
- Complaint phone numbers are masked on the desk (`+234 ••• ••` last-2) — PII hygiene kept even inside the admin console.

## 6. Roadmap (next, by ROI)
1. NPS/CSAT post-resolution survey + complaint-driver Pareto panel (GAP-2/GAP-6) — engines exist to anchor it.
2. Replace remaining static panels on the exec home with engine projections (agents/terminals/ledger/treasury) (GAP-1).
3. Merchant console engine wiring (merchant registry + settlement state) (GAP-5).
4. Repeat-complainant + complaints-per-agent quality linkage surfaced to the agents console (GAP-6).
5. Bill-payments shell → BillerServiceEngine network view (per-biller volumes/settlements) (GAP-5).
