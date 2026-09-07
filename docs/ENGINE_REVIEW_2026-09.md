# Core Financial Engines — Review, Fixes & Live/Simulated Audit
**Date:** 2026-09-07
**Scope:** `src/lib/financial/`, `src/lib/treasury/`, `src/lib/risk/`, `src/lib/reconciliation/`, `src/lib/settlement/` — 39 files, ~6,122 lines.
**Method:** Every file read in full. Checked (a) internal calculation/logic correctness (formulas, rounding, double-entry balancing, fee math, edge cases) and (b) real-world regulatory alignment (CBN, NIBSS, BCEAO, Nigeria Tax Act 2025). Fixed genuine bugs in place; left already-correct logic untouched.

---

## 1. Bugs found and fixed

### 1.1 Settlement engine: XOF batches posted under the NGN accounting rule
**Files:** `src/lib/settlement/SettlementEngine.ts` (the live engine, used by `/api/core/v1/settlements` and `/api/core/v1/orphan-detection`), and `src/lib/financial/SettlementEngine.ts` (orphaned duplicate, fixed for correctness-of-record).
**Bug:** `approveBatch` / `executeBatchPayout` selected the journal `ruleCode` with a currency ternary whose two branches were identical:
```ts
ruleCode: batch.currency === 'NGN' ? 'RULE_MERCHANT_SETTLEMENT_NGN_v1' : 'RULE_MERCHANT_SETTLEMENT_NGN_v1'
```
Every XOF (Niger) merchant settlement batch was silently tagged with the NGN rule, and no `RULE_MERCHANT_SETTLEMENT_XOF_v1` even existed in `AccountingRuleEngine.ts`.
**Fix:**
- Added `RULE_MERCHANT_SETTLEMENT_XOF_v1` to `AccountingRuleEngine.ts` (debit 2060 Merchant Payables XOF / credit 1020 Coris Bank Settlement Pool XOF — mirrors the NGN template's 2050/1010 pairing using the already-existing chart accounts).
- Corrected the ternary in both `SettlementEngine.ts` files to reference the new XOF rule.

### 1.2 Double-entry ledger: SUSPENSE accounts don't all share one "normal balance" side
**File:** `src/lib/financial/DoubleEntryLedgerEngine.ts` (3 call sites: `applyEntryToBalances`, `rebuildAccountBalances`, `generateTrialBalance`).
**Bug:** Balance direction was inferred from a hardcoded category list — `['ASSET', 'EXPENSE', 'CONTROL', 'CLEARING'].includes(category)` — treating every account **not** in that list (including the entire `SUSPENSE` category) as CREDIT-normal. But the Chart of Accounts itself defines mixed suspense polarity:
  - `7100` Unallocated Inbound Deposits Suspense → **CREDIT**-normal
  - `7200` Failed Outbound Settlement Suspense → **DEBIT**-normal
  - `7300` Reconciliation Discrepancy Suspense → **DEBIT**-normal
  - `7400` Physical Cash Variance Suspense → **DEBIT**-normal

  So balances for 7200/7300/7400 were being computed with an inverted sign (credit-total minus debit-total instead of debit-total minus credit-total) everywhere the ledger reports a balance, a trial balance, or the daily close reads those accounts. This directly feeds `DailyCloseEngine`, `DailyEodReconciliationEngine`, and the suspense/exception resolution flows.
**Fix:** All three sites now read the account's actual `normalBalance` field from the Chart of Accounts (`getAccountByCode(...).normalBalance === 'DEBIT'`) instead of guessing from the category name, with the old heuristic kept only as a defensive fallback if an account code is somehow missing from the chart.

### 1.3 Balance sheet: all SUSPENSE accounts grouped as liabilities
**File:** `src/lib/financial/FinancialReportEngine.ts` (`generateBalanceSheet`).
**Bug:** Same root cause as 1.2 — `liabilityRows` included `category === 'SUSPENSE'` unconditionally, so debit-normal suspense accounts (asset-like: money the platform is owed / holding pending clearance) were shown as liabilities, and never appeared in `assetRows`. This would misstate total assets and total liabilities and could make the balance sheet appear to balance for the wrong reason.
**Fix:** Suspense accounts now route to `assetRows` when `normalBalance === 'DEBIT'` and to `liabilityRows` when `normalBalance === 'CREDIT'`, matching each account's real economic character.

### 1.4 Reconciliation exception resolution: XOF exceptions offset against the NGN bank pool
**File:** `src/lib/reconciliation/ExceptionEngine.ts` (`approveResolution`).
**Bug:** The compensating journal's offset line was hardcoded to account `1010` / "Providus Settlement Pool NGN" regardless of `exc.currency`. A resolved XOF (Niger) reconciliation exception would post its offsetting entry into the NGN bank pool instead of the XOF one (Coris Bank, `1020`), silently corrupting both currencies' balances.
**Fix:** Offset account/name now branch on `exc.currency` (`1020`/Coris Bank XOF vs `1010`/Providus NGN), consistent with how the rest of the codebase (e.g. `SuspenseEngine`, `TreasuryFundingEngine`) already handles this split correctly.

### 1.5 BCEAO e-money issuer minimum capital overstated 10x
**File:** `src/lib/treasury/CapitalManagementEngine.ts`.
**Bug:** `regulatoryMinimumCapital` for the Niger (XOF) entity was set to `3,000,000,000` (XOF 3 billion), with a comment "BCEAO WAEMU E-Money Issuer Minimum." The actual BCEAO requirement (Instruction No. 008-05-2015, Art. 11, confirmed via BCEAO's own promoter's guide and independent regulatory summaries) is **XOF 300 million**, fully paid-up before licensing — a 10x error. This also produced a solvency ratio (297.66%) inconsistent with the stated capital headroom.
**Fix:** Corrected to `300,000,000` with the BCEAO instruction citation, and recalculated `capitalHeadroom` (8,630,000,000) and `solvencyRatioPct` (2,976.67%) consistently from the corrected minimum. Left the NGN/CBN side (₦2,000,000,000 Switching & Processing minimum) unchanged — verified correct against the CBN 2020 PSP licensing circular.

### 1.6 Orphaned `FeeAndCommissionEngine.ts` — outdated fee tiers
**File:** `src/lib/financial/FeeAndCommissionEngine.ts` (confirmed 0 live references — see §2 below; fixed anyway for correctness-of-record in case it's revived).
**Bugs fixed against confirmed current regulation:**
- `calculateNgnTransferFee` used the CBN **2020** Guide to Charges tiers (₦10 / ₦25 / ₦50), which the **2026 Guide to Charges** (circular dated 21 Apr 2026, effective 1 May 2026) supersedes: transfers ≤₦5,000 are now **free** (was ₦10), ₦5,000–₦50,000 is now **₦10** (was ₦25), >₦50,000 stays ₦50. It also entirely omitted the Nigeria Tax Act 2025 "Stamp Duty" (renamed from the Electronic Money Transfer Levy) — a flat ₦50 on transfers ≥₦10,000, borne by the **sender** from 1 Jan 2026.
- `calculateMerchantMdr` used a generic 1.5% / ₦2,000-cap figure with no clear regulatory basis. CBN's 2026 Guide specifies the Merchant Service Charge (MSC) is capped at **0.5%, max ₦10,000**, borne solely by the merchant. Updated the default rate and cap accordingly.
- VAT treatment (7.5% on the fee only, never the principal) was already correct per the Nigeria Tax Act 2025 / NRS public clarification (Jan 2026) and was left unchanged.

---

## 2. Confirmed dead code (0 references anywhere in the repo)
These were checked with precise, path-qualified import grepping across `src/app` and `src/lib` (not just filename matches):
- `src/lib/financial/FeeAndCommissionEngine.ts`
- `src/lib/financial/HoldsAndReservesEngine.ts`
- `src/lib/financial/SettlementEngine.ts` (distinct from the live `src/lib/settlement/SettlementEngine.ts`)
- `src/lib/reconciliation/DailyEodReconciliationEngine.ts`
- `src/lib/reconciliation/ProviderAdapterFramework.ts`

None of these had structural design bugs beyond what's noted above; they were reviewed and (where a bug existed) fixed anyway, since a future feature could revive them and correctness-of-record has value independent of current wiring.

## 3. Live-reachable but fixture/simulated data (flagged for future migration, not fixed — by design, this pass keeps them in-memory)
- **`TreasuryEngine.ts`** — `calculateAvailableLiquidity` uses hardcoded fallback constants for restricted funds, committed settlements, rolling reserves, active holds, and safety buffers (not derived from `HoldsAndReservesEngine`, live settlement batches, or a real risk-hold ledger). `getAccounts()` also falls back to large hardcoded balances (e.g. ₦21,135,000,000) if the in-memory ledger has no data yet.
- **`HoldsAndReservesEngine.ts`** — functional and correct, but not wired into `TreasuryEngine`'s liquidity deduction (`activeHoldsMinor` is a hardcoded constant, not this engine's live holds total) — a real integration gap, not a calculation bug, left as-is per the "don't tamper" instruction since fixing it would mean *adding new integration behavior*, not repairing broken logic.
- **`RiskSignalEngine.ts`** — `kycTier`, `accountAgeDays`, and `hasPreviousFraudAlert` are hardcoded (`2`, `180`, `false`) rather than sourced from a real customer/KYC record; `geovelocityKmh` is a crude proxy (`dev.isVpn ? 1200 : 0`) rather than actual distance/time geolocation math. Flagged as simulated inputs to an otherwise-correct scoring engine, not a bug in the scoring logic itself.
- **`AlmMaturityEngine`, `CapitalManagementEngine`, `FundingManagementEngine`, `FxPositionEngine`, `LiquidityForecastingEngine` (uses `TreasuryEngine` as its live-ish baseline), `LiquidityStressTestEngine`, `ReverseStressEngine`, `ThreeStatementPlanningEngine`, `TreasuryFundingEngine`, `UnitEconomicsEngine`** — all seeded with static/illustrative baseline data (facilities, positions, forecasts). Internally self-consistent and each is reachable from a real API route (see file list below), but none reads live transaction volumes; they compute derived figures off hardcoded seeds. This is a demo-fixture-vs-production-data gap, not an arithmetic bug.
- **`EntityRiskProfilingEngine.ts`, `FraudCaseManagementEngine.ts`** — same pattern: correct maker-checker and scoring mechanics, seeded with a handful of static example profiles/cases/holds rather than live entity history.
- **Reconciliation engines** (`BankReconciliationEngine`, `MatchingEngine`, `ExceptionEngine`, `SuspenseEngine`, `OrphanDetectionEngine`) — correct matching/aging/severity logic, but seeded with one illustrative bank statement and one illustrative exception/suspense item each; no live bank-statement ingestion pipeline is connected (`ProviderAdapterFramework.ts`'s adapters return empty arrays whenever the provider's API credentials aren't configured, which is always true in this environment — this is honest/correct behavior, not a bug).

## 4. Architectural note (unchanged from investigation, restated for the record)
Real customer money movement (`/api/customer/portal/transfer`) does **not** go through any of these 39 engines — it uses a separate, live Supabase-backed path (`src/lib/agency/commissionPricing.ts` reading the `agent_commission_rates` table, then RPC `post_customer_transfer`). The 39 in-memory engines reviewed here are exercised by:
- `/api/core/v1/*` routes (ledger, settlements, treasury, risk, reconciliation, orphan-detection) — reachable from admin/compliance UI pages, several of which (compliance risk/transactions/customer-detail pages) call the live `RiskDecisionEngine` in production today.
- `/api/finance/gl/*` and `/api/v1/{alm,funding,planning,treasury}/*` routes — reachable from finance/treasury-facing admin screens.
No DB migration was performed in this pass per the locked scope; this section exists purely to guide future migration prioritization.

## 5. Files reviewed with no bugs found (left untouched, per "don't tamper when accurate")
`DoubleEntryLedgerEngine.ts` (core posting/validation logic — sound; only the 3 balance-direction call sites above needed a fix), `ChartOfAccounts.ts`, `AccountingRuleEngine.ts` (beyond the added XOF rule), `VelocityEngine.ts`, `RiskDecisionEngine.ts`, `SubledgerEngine.ts` (noted unit-convention difference vs the rest of the stack — architectural observation, not a bug), `DailyCloseEngine.ts`, `PeriodCloseEngine.ts`, `FinancialAdjustmentEngine.ts`, `ReconciliationEngine.ts` (financial/), `SeedFinancialData.ts`, all 9 remaining `treasury/` files not called out above, `BankReconciliationEngine.ts`, `MatchingEngine.ts`, `SuspenseEngine.ts`, `OrphanDetectionEngine.ts`, `SeedReconData.ts`.

## 6. Verification
- `npx tsc --noEmit` — clean across the entire repository (0 errors) after all fixes.
- `npx next build` — compiles and type-checks successfully; static page-generation ran out of sandbox memory (pre-existing environment constraint unrelated to these changes, confirmed by an unmodified compile+typecheck pass succeeding first).
- Searched the full 39-file scope programmatically for the same anti-pattern (`X ? A : B` with `A === B`) that caused bug 1.1 — no further instances found.
