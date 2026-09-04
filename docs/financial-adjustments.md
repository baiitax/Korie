# Financial Adjustments & Maker-Checker Dual Control

## 1. Governance Principles
Manual updates to balances or direct SQL writes are prohibited. Any adjustment to customer balances, merchant balances, or suspense allocations must pass through a strict **Maker-Checker Dual Control workflow**.

## 2. Maker-Checker Segregation of Duties
1. **The Maker (Treasury Analyst / Support Lead)**:
   - Identifies the required balance correction or suspense resolution.
   - Selects the Target Account and Offset Balancing Account in the Chart of Accounts.
   - Specifies exact integer minor-unit amount and attaches audit evidence (bank statement PDF or dispute log).
   - Submits request (`status = PENDING_APPROVAL`).
2. **The Checker (Finance Director / Chief Financial Officer)**:
   - Reviews the request, target/offset accounts, and attached audit evidence.
   - The Checker **CANNOT** be the same person who created the request (`makerId !== checkerId`).
   - If rejected: request is marked `REJECTED` with detailed notes.
   - If approved: system automatically invokes `DoubleEntryLedgerEngine.postJournalEntry` to commit the balanced adjustment journal.
