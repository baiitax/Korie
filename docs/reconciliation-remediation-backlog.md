# KoriePay Reconciliation & Settlement Engine — Remediation Backlog

## 1. Prioritized Implementation Plan

| ID | Priority | Domain | Description | Target Deliverable |
|---|---|---|---|---|
| **REC-01** | **P0** | Matching Engine | Implement 5-Level Matching Hierarchy with Confidence Scoring (0–100) | `src/lib/reconciliation/MatchingEngine.ts` |
| **REC-02** | **P0** | Settlement Engine | State machine (`DRAFT` ➔ `SETTLED`), eligibility formula, and Maker-Checker | `src/lib/settlement/SettlementEngine.ts` |
| **REC-03** | **P1** | Bank Reconciliation | MT940 / CSV parser, opening-closing balance assertions, and bank ledger comparison | `src/lib/reconciliation/BankReconciliationEngine.ts` |
| **REC-04** | **P1** | Suspense Aging | 6-stage aging schedule (0–1d, 2–3d, 4–7d, 8–14d, 15–30d, 30+d) & resolution | `src/lib/reconciliation/SuspenseEngine.ts` |
| **REC-05** | **P1** | Exception Work Queue | Root-cause classification (18 types), SLA tracking, assignment & resolution | `src/lib/reconciliation/ExceptionEngine.ts` |
| **REC-06** | **P1** | Provider Adapters | Standardized `ProviderAdapter` for Providus Bank NG and Koris Bank NE | `src/lib/reconciliation/ProviderAdapterFramework.ts` |
| **REC-07** | **P2** | Orphan Detection | Continuous detection of orphan provider records, txns, and bank movements | `src/lib/reconciliation/OrphanDetectionEngine.ts` |
| **REC-08** | **P2** | EOD Daily Close | 15-step End-of-Day reconciliation workflow and control reports | `src/lib/reconciliation/DailyEodReconciliationEngine.ts` |
| **REC-09** | **P2** | REST APIs | Complete `/api/core/v1/reconciliation/*` and `/api/core/v1/settlements/*` family | `src/app/api/core/v1/...` |
| **REC-10** | **P3** | UI Command Center | Real-time Reconciliation & Settlement Command Centers with Transaction 360° | `src/app/admin/reconciliation/page.tsx` & `settlements/page.tsx` |
