# Balance Derivation Engine Architecture

## 1. Derived Views vs. Direct Updates
In KoriePay Tier-1 architecture, account balances are **never directly updated** via `UPDATE accounts SET balance = balance + 100`.
Instead, balances are computed views derived from posted double-entry journal lines:

$$\text{Asset/Expense Balance} = \sum \text{Debits} - \sum \text{Credits}$$
$$\text{Liability/Equity/Revenue Balance} = \sum \text{Credits} - \sum \text{Debits}$$
$$\text{Available Balance} = \text{Calculated Balance} - \text{Locked Holds}$$

## 2. High-Performance Balance Projections
To enable sub-millisecond wallet balance lookups during high-volume spikes:
1. `account_balances` acts as a fast projection cache.
2. Every committed journal line applies delta increments to `posted_debit_total` and `posted_credit_total`.
3. An automated daemon (`/api/core/v1/ledger/rebuild`) re-evaluates all balances from the genesis block up to the latest journal entry to detect and alert on any state drift.
