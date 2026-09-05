# Reconciliation note — demo sweep branch vs remote live-console work

Date: 2026-09-06 · Branch: `feature/compliance-portal-demo-rebuild` (base `ff108bc`)

## Why this note exists

While the demo sweep (this branch) was in progress, `origin/main` received two
commits on 2026-09-05 23:05–23:07 UTC from a parallel effort:

- `245afe3` — feat(compliance): put the console on live reads, and build the
  screens the rail promised (adds its own chrome: `PortalShell.tsx`, `nav.ts`,
  `ui/*`, `services/compliance/*` with real API hooks).
- `6f07b6f` — feat(agency): float top-up workflow, real commission data,
  sub-agent team management.

A straight fast-forward push of this branch was therefore rejected. The rebase
was aborted on purpose and this branch was pushed as-is so **neither body of
work is lost**. Nothing on `origin/main` has been overwritten.

## What each side covers

| | `origin/main` (post 23:05) | this branch (`ff108bc`) |
|---|---|---|
| Data model | Live reads via `services/compliance/*` hooks against real backend APIs | Portal-store demo datasets (`CompliancePortalContext`, `services/compliancePortalData`) with demo-mode marking |
| Shell/chrome | `PortalShell` + `ui/*` kit | `ComplianceShell` + `ui/Ck`/`charts` kit, light-first, dark parity, bottom nav |
| Compliance pages | 37 (30 of them overlap with ours) | 41 including detail workspaces (`kyc/[id]`, `kyb/[id]`, `transaction-monitoring/[id]`, `alerts/[id]`, `sanctions/[id]`, `pep/[id]`, `risk/[id]`, `am/[id]`, `aml/[id]`, `investigations/[id]`) |
| Locales | — | EN superset (zero missing keys) + FR/HA chrome translations + EN fallback merge |
| Unique to us | — | `activity`, `am` + detail, `transaction-monitoring/[id]`, all review workspaces, approvals/tasks/escalations/settings/integrations/system-health/reports etc. (see diff) |
| Unique to them | `dashboard`, `work-queue`, `edd`, `adverse-media`, `merchants`, `agents`, `transactions` (legacy-style) | — (we deleted 6 orphan legacy routes with no inbound links) |

## Overlap (30 routes written by both sides)

alerts, alerts/[id], aml, analytics, approvals, audit, calendar, cases,
cases/[id], compliance root, customers, customers/[id], escalations,
integrations, investigations, kyb, kyc, layout, pep, policies,
regulatory-reporting, reports, restrictions, risk, sanctions, settings,
system-health, tasks, team, transaction-monitoring, watchlists
(list is the conflict set observed during the aborted rebase).

## Suggested next step (pick one)

1. **Decide which console is canonical for each overlapping route.** The two
   implementations differ in data contract (live API vs demo store) and chrome
   (`PortalShell` vs `ComplianceShell`). A blind merge produces two kits and two
   shells living side by side — workable but noisy.
2. **Preferred demo-first option:** keep this branch's shell + module sweep as
   the demo/fallback mode and port the live-read pages behind the same demo/live
   service seam (`CompliancePortalContext` already isolates datasets behind
   lookups so a live adapter can replace mocks without page rewrites).
3. **Or promote the live-console pages** on the shared routes and keep this
   branch's detail workspaces/queues only where remote has none.

Whoever reconciles should run, in order: `npx tsc --noEmit`,
`npx next build`, then the route smoke list in `00-audit-and-plan.md`.
