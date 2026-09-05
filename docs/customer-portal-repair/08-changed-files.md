# 08 — Changed files

Baseline `8b39898`. Generated from `git diff --numstat HEAD` + `git status --porcelain`,
so the numbers are the diff itself rather than a hand-kept list.

**107 paths touched** — +4,483 / −1,535 lines across the 88 tracked files, plus
19 new source files (the ten report files under `docs/customer-portal-repair/`
are excluded from that count). The brand sweep accounts for 53 of the modified
files and is 1–4 lines in each.

## customer APIs — 5 files

| File | + | − |
|---|---|---|
| `src/app/api/beneficiaries/route.ts` | 119 | 24 |
| `src/app/api/core/v1/identity/documents/route.ts` | 156 | 23 |
| `src/app/api/customer/portal/route.ts` | 70 | 62 |
| `src/app/api/customer/portal/transfer/route.ts` | 19 | 9 |
| `src/app/api/v1/internal/reconciliation/route.ts` | 1 | 1 |

## customer components — 11 files

| File | + | − |
|---|---|---|
| `src/components/admin/AdminTopBar.tsx` | 1 | 1 |
| `src/components/admin/CommandCenterOverview.tsx` | 2 | 2 |
| `src/components/customer/CustomerContext.tsx` | 467 | 192 |
| `src/components/customer/ui/CustomerShell.tsx` | 255 | 174 |
| `src/components/customer/ui/PinModal.tsx` | 77 | 50 |
| `src/components/customer/ui/ReportDisputeModal.tsx` | 123 | 56 |
| `src/components/developer/SandboxSimulatorModal.tsx` | 3 | 3 |
| `src/components/loading/BootstrapLoader.tsx` | 72 | 28 |
| `src/components/loading/KpayTransactionLoader.tsx` | 72 | 19 |
| `src/components/loading/LoadingContext.tsx` | 18 | 0 |
| `src/components/support/CreateTicketModal.tsx` | 1 | 1 |

## customer libs/services/types — 14 files

| File | + | − |
|---|---|---|
| `src/lib/cash/CashForecastingEngine.ts` | 1 | 1 |
| `src/lib/customer/BeneficiarySecurityEngine.ts` | 11 | 0 |
| `src/lib/customer/customerFeatures.ts` | 9 | 1 |
| `src/lib/customerPortalClient.ts` | 5 | 0 |
| `src/lib/iam/PrivilegedAccessEngine.ts` | 1 | 1 |
| `src/lib/identity/DocumentVaultEngine.ts` | 31 | 1 |
| `src/lib/reporting/DataLineageEngine.ts` | 1 | 1 |
| `src/lib/services/TransactionService.ts` | 46 | 0 |
| `src/lib/treasury/ReverseStressEngine.ts` | 1 | 1 |
| `src/services/developerDataService.ts` | 2 | 2 |
| `src/services/supportDataService.ts` | 4 | 4 |
| `src/types/customer.ts` | 4 | 1 |
| `src/types/database.ts` | 11 | 1 |
| `src/types/ledger.ts` | 1 | 1 |

## customer pages — 12 files

| File | + | − |
|---|---|---|
| `src/app/customer/fund/page.tsx` | 2 | 5 |
| `src/app/customer/kyc/page.tsx` | 317 | 90 |
| `src/app/customer/page.tsx` | 183 | 126 |
| `src/app/customer/payments/page.tsx` | 70 | 9 |
| `src/app/customer/profile/page.tsx` | 9 | 0 |
| `src/app/customer/receive-money/page.tsx` | 9 | 0 |
| `src/app/customer/security/page.tsx` | 139 | 100 |
| `src/app/customer/send-money/page.tsx` | 56 | 9 |
| `src/app/customer/settings/page.tsx` | 165 | 74 |
| `src/app/customer/support/page.tsx` | 250 | 66 |
| `src/app/customer/transactions/page.tsx` | 474 | 188 |
| `src/app/customer/wallets/page.tsx` | 183 | 93 |

## docs (brand sweep) — 27 files

| File | + | − |
|---|---|---|
| `docs/adashi-liquidity-architecture.md` | 1 | 1 |
| `docs/aggregator-translation-glossary.md` | 1 | 1 |
| `docs/api-errors.md` | 1 | 1 |
| `docs/beneficiary-security.md` | 1 | 1 |
| `docs/core-financial-engine.md` | 2 | 2 |
| `docs/customer-routes.md` | 2 | 2 |
| `docs/developer-onboarding.md` | 1 | 1 |
| `docs/developer-support.md` | 1 | 1 |
| `docs/financial-controls.md` | 1 | 1 |
| `docs/financial-forecasting-and-liquidity-models.md` | 1 | 1 |
| `docs/financial-reconciliation-reporting.md` | 1 | 1 |
| `docs/gateway-architecture.md` | 1 | 1 |
| `docs/gateway-operations-runbooks.md` | 1 | 1 |
| `docs/integration-fabric-architecture.md` | 1 | 1 |
| `docs/payment-finance-integration.md` | 1 | 1 |
| `docs/payment-routing-engine.md` | 1 | 1 |
| `docs/product-factory.md` | 1 | 1 |
| `docs/production-access.md` | 1 | 1 |
| `docs/reconciliation-accounting.md` | 1 | 1 |
| `docs/reconciliation-provider-map.md` | 1 | 1 |
| `docs/reconciliation-system-map.md` | 2 | 2 |
| `docs/reconciliation.md` | 1 | 1 |
| `docs/recovery-runbooks.md` | 1 | 1 |
| `docs/super-admin-routes.md` | 1 | 1 |
| `docs/support-runbook.md` | 1 | 1 |
| `docs/transaction-state-machine.md` | 1 | 1 |
| `docs/treasury-runbooks.md` | 1 | 1 |

## locales (en/fr/ha) — 4 files

| File | + | − |
|---|---|---|
| `src/locales/en.ts` | 331 | 22 |
| `src/locales/fr.ts` | 331 | 22 |
| `src/locales/ha.ts` | 331 | 22 |
| `src/locales/merchant/fr.ts` | 1 | 1 |

## other portals (brand sweep) — 15 files

| File | + | − |
|---|---|---|
| `src/app/admin/apis/page.tsx` | 2 | 2 |
| `src/app/admin/cash-operations/page.tsx` | 1 | 1 |
| `src/app/admin/intelligence/page.tsx` | 1 | 1 |
| `src/app/admin/payments/page.tsx` | 1 | 1 |
| `src/app/admin/risk/page.tsx` | 1 | 1 |
| `src/app/aggregator/merchants/page.tsx` | 1 | 1 |
| `src/app/aggregator/reconciliation/page.tsx` | 1 | 1 |
| `src/app/compliance/page.tsx` | 1 | 1 |
| `src/app/developers/dashboard/page.tsx` | 1 | 1 |
| `src/app/developers/explorer/page.tsx` | 1 | 1 |
| `src/app/developers/logs/page.tsx` | 1 | 1 |
| `src/app/developers/page.tsx` | 1 | 1 |
| `src/app/developers/sandbox/page.tsx` | 3 | 3 |
| `src/app/login/page.tsx` | 1 | 1 |
| `src/app/register/page.tsx` | 1 | 1 |

## New files — 19

| File | lines |
|---|---|
| `src/app/api/customer/portal/beneficiaries/route.ts` | 154 |
| `src/app/api/customer/portal/disputes/route.ts` | 203 |
| `src/app/api/customer/portal/notifications/route.ts` | 150 |
| `src/app/api/customer/portal/transactions/[reference]/route.ts` | 121 |
| `src/app/api/customer/portal/transactions/route.ts` | 101 |
| `src/app/api/customer/portal/verification/route.ts` | 186 |
| `src/components/customer/ui/CustomerProfileGate.tsx` | 52 |
| `src/components/customer/ui/CustomerStateViews.tsx` | 165 |
| `src/components/customer/ui/DocumentUploader.tsx` | 284 |
| `src/components/customer/ui/FloatingMobileNav.tsx` | 288 |
| `src/components/customer/ui/ThemeSelector.tsx` | 112 |
| `src/components/customer/ui/TransactionRow.tsx` | 146 |
| `src/components/customer/ui/TransactionStatusBadge.tsx` | 71 |
| `src/lib/customer/CustomerTransactionQuery.ts` | 463 |
| `src/lib/customer/CustomerVerification.ts` | 290 |
| `src/lib/customer/customerApiError.ts` | 208 |
| `src/lib/customer/customerScope.ts` | 77 |
| `src/lib/customer/disputeStatus.ts` | 73 |
| `src/lib/customer/verificationLabels.ts` | 88 |

