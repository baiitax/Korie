# Automated Daily Financial Close & End-of-Day Pipeline

## 1. Daily Close Workflow
Every night at 23:59:59 UTC, the automated close daemon executes the following steps:
1. **Intake Freeze**: Closes the active accounting period for the value date and transitions status to `SOFT_CLOSED`.
2. **Double-Entry Equilibrium Verification**: Runs full trial balance computation; checks that $\sum \text{Debits} == \sum \text{Credits}$.
3. **Proof of Reserve & Solvency Assertion**:
   - Asserts that Providus Bank Pool (`1010`) + Koris Bank Pool (`1020`) $\ge$ Customer Wallet Liabilities (`2010` + `2020`).
4. **Suspense Aging Increment**: Advances age of all unresolved items in `7100`, `7200`, `7300` by 1 day.
5. **Snapshot & Certificate Creation**: Writes a permanent close record into `daily_financial_closes` with cryptographic hash signature.
6. **Open Next Value Date**: Opens next accounting period.
