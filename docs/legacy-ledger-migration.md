# Legacy Ledger Migration & Cutover Strategy

## 1. Migration Overview
This specification governs the zero-downtime cutover from legacy isolated balance stores to the authoritative KoriePay Double-Entry Core Financial Engine.

## 2. Cutover Protocol
1. **Pre-Migration Audit**: Calculate aggregate balance of all legacy customer, agent, and merchant accounts.
2. **Opening Balance Journal Posting**:
   - For each currency (`NGN`, `XOF`), create an immutable opening journal entry:
     - **Debit**: Asset Clearing Pool (`1010` / `1020`)
     - **Credit**: Customer Wallet Deposits (`2010` / `2020`)
     - **Credit**: Retained Platform Earnings (`3010`)
3. **Dual-Write Verification Period**: For 7 calendar days, all financial requests execute dual-writes to legacy tables and the double-entry engine.
4. **Authoritative Handover**: Flip traffic toggle to treat the double-entry ledger as the sole source of truth.
5. **Decommission Legacy Balances**: Set legacy balance fields to READ-ONLY.
