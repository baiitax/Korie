# Immutable Double-Entry Ledger Architecture

## 1. Mathematical Guarantee
The double-entry ledger is governed by the universal accounting identity:
$$\text{Assets} = \text{Liabilities} + \text{Equity}$$
$$\sum \text{Debits} = \sum \text{Credits}$$

## 2. Normal Balance Conventions
| Category | Normal Balance | Increase Direction | Decrease Direction |
|---|---|---|---|
| **ASSET** | DEBIT | DEBIT | CREDIT |
| **EXPENSE** | DEBIT | DEBIT | CREDIT |
| **CONTROL** | DEBIT | DEBIT | CREDIT |
| **CLEARING** | DEBIT | DEBIT | CREDIT |
| **LIABILITY** | CREDIT | CREDIT | DEBIT |
| **EQUITY** | CREDIT | CREDIT | DEBIT |
| **REVENUE** | CREDIT | CREDIT | DEBIT |
| **SUSPENSE** | CREDIT / DEBIT | Depends on discrepancy | Opposite |

## 3. Immutability Enforcements
1. **Database Triggers**: The PostgreSQL trigger `trg_immutable_financial_records` raises an uncatchable exception on any SQL `UPDATE` or `DELETE` against `journal_entries` or `journal_lines`.
2. **Reversals**: To correct a mistaken entry, an exact compensating journal is created with mirrored debit/credit lines and linked via `reversal_journal_id`.
3. **Integer Minor Units**: All monetary amounts are stored as exact integer minor units (kobo for NGN, centimes for XOF). Floating point numbers are strictly forbidden.
