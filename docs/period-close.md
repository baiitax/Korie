# Accounting Period Management & Period-Close Protocol

## 1. Accounting Period Lifecycles
Periods progress through four discrete states:
1. `OPEN`: Active postings permitted across all channels.
2. `SOFT_CLOSED`: Postings restricted to authorized finance controllers for adjustments.
3. `CLOSED`: All operational posting disabled. System runs reconciliation verification and closing balances computation.
4. `LOCKED`: Immutable historical lock. Requires board-level maker-checker override to reopen.

---

## 2. 12-Step Period Close Workflow
1. Cut off operational batch intakes.
2. Verify all in-flight switch attempts are terminal (`SUCCESS` or `FAILED`).
3. Reconcile external provider bank statements against clearing accounts.
4. Sweep and resolve suspense entries (`7000-7999`).
5. Calculate and post provider fee expense accruals.
6. Revalue foreign currency holdings at closing central bank rates (CBN / BCEAO).
7. Execute automated Trial Balance balancing check.
8. Generate draft Income Statement and Balance Sheet.
9. Conduct Maker-Checker Financial Controller review.
10. Post Net Income to Retained Earnings (`3010`).
11. Transition Period to `LOCKED`.
12. Archive cryptographic hash snapshot of the ledger state.
