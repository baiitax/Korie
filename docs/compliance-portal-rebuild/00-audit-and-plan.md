# Compliance Command Center — Rebuild Audit & Plan

Date: 2026-09-05 · Scope: `baiitax/Korie` @ `59415ba`

## Current system map

```
CURRENT SYSTEM (KoriePay)
  ├─ Next.js 14.2 App Router, TS, Tailwind 3.4, lucide-react
  ├─ Supabase migrations (28) — full financial DB model (double-entry ledger, RLS,
  │    wallets, adashi, treasury) but NO deployed live env wired in the demo build
  ├─ 237 API route handlers under src/app/api (mock/graceful fallback mode)
  ├─ Real backend engines in src/lib: aml/* (AmlAlertEngine, AmlCaseManagementEngine,
  │    AmlCustomerRiskProfileEngine, AmlNetworkGraphEngine, AmlScenarioEngine,
  │    AmlScreeningProvider), risk/, regulatory/, identity/, erm/
  ├─ Light-first global theme: :root light default, .dark support, .light legacy remap
  │    layer; theme persisted as `koriepay_theme` (html.light|.dark)
  └─ i18n: EN/FR/HA per portal under src/locales/<portal>/{en,fr,ha}.ts, parity gate
       in prebuild (1350 keys aggregate, green)

CURRENT COMPLIANCE PORTAL (audit results)
  ├─ 22 routes under src/app/compliance (+ layout.tsx)
  ├─ Single-page style: most list views = bespoke tables in one file
  ├─ Data: ComplianceContext (components/compliance/ComplianceContext.tsx) over
  │    centralized demo service services/complianceDataService.ts (634 LOC) +
  │    typed domain in types/compliance.ts (458 LOC, rich: KYC/KYB/AML/cases/
  │    sanctions/restrictions/telemetry/audit/calendar/policies)
  ├─ Actions already real (client state): KYC/KYB decisions, AML disposition,
  │    sanctions disposition, case create/timeline/evidence/notes/decide,
  │    restrictions maker/approve/lift, report submission, calendar ack, audit log
  ├─ Locales: compliance en/fr/ha only 87 LOC each (mostly unused; pages hard-code EN)
  ├─ Shell: dark-styled header+sidebar (light via legacy .light overrides only),
  │    jurisdiction NG/NE/CROSS_BORDER switcher, officer switcher, mobile drawer
  └─ Gaps vs target brief: no customers/KYB-review/tasks/approvals/escalations/
      watchlists/reports-center/system-health/integrations/settings; no universal
      search, no notification center, no breadcrumbs, no bottom nav, sparse
      loading/empty/error states, low i18n coverage, heavy dark-on-light coercion

PLAN (keep model, rebuild experience)
  P1 Tokens/CSS layer  — scoped .kp-c, light-first glass, dark overrides
  P2 Types + demo data — types/compliancePortal.ts; services/compliancePortalData.ts
       (customers, accounts, transactions XOF|NGN, alerts, sanctions/pep matches,
        watchlists, tasks, approvals, escalations, reports, audits, integrations,
        health, activity) + compliancePortalStore context (state+actions+toasts)
  P3 Kit               — components/compliance/ui/*: card, kpi, table, toolbar,
       drawer, modal, states (skeleton/empty/error), charts (donut/bars/hbar),
       timeline, avatar, toast
  P4 Shell             — new sidebar IA (per brief §10), header w/ breadcrumb,
       ⌘K command palette search, notification center, profile menu, theme/lang
       controls, jurisdiction chip, mobile bottom nav
  P5 Workspaces        — dashboard KPIs/risk distribution/KYC analytics/AML/attention
       center/activity/health; customers+profile; KYC queue+review; KYB;
       transactions monitor+detail; AML desk; risk & fraud; sanctions; PEP;
       watchlists; alerts queue+detail; cases; investigations; approvals; tasks;
       escalations; reports; analytics; audit (+detail); integrations; system
       health; settings — every page: loading (skeleton), empty, error states
  P6 i18n EN/FR/HA     — full coverage of authored copy; parity re-check
  P7 QA                — route/link sweep, tsc + next build, responsive checks
```

## Non-negotiable rules honored
KoriePay brand first · light first · XOF first, NGN second (no USD) · **Coris Bank** (never "Koris") · demo data centralized + clearly marked · no frontend-only auth claims · no exposed secrets · masked PII everywhere · every nav item valid · every button purposeful · mobile first-class.
