# General Ledger Architecture & Double-Entry Engine

## 1. Schema Hierarchy
The Ledger engine operates on a three-tier model:
- **General Ledger (GL)**: Master summary book holding aggregated balances per account and dimension.
- **Subledgers**: Detailed sub-accounts holding granular balances for individual customers, merchants, providers, and agents.
- **Journal Entries & Lines**: Atomic ledger mutations containing balanced debits and credits linked by unique transaction IDs.

---

## 2. Invariant Enforcement Mechanism
When posting a journal:
1. Validate that all accounts exist and are `ACTIVE`.
2. Verify that currency is homogeneous across lines or that an explicit FX bridge clearing line is provided.
3. Calculate:
   $$\Delta = \sum \text{Debits} - \sum \text{Credits}$$
4. Reject posting with `LEDGER_UNBALANCED` exception if $|\Delta| > 0.0001$.
5. Update Subledger balances and GL running balances within a single database transaction.
