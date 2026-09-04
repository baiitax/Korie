# Finance Platform Architecture & Multi-Dimensional Accounting

## 1. Core Financial Principles
1. **Double-Entry Invariant**: Every financial event consists of equal and opposite debits and credits:
   $$\sum \text{Debits} \equiv \sum \text{Credits}$$
2. **Immutability of the Ledger**: General ledger journals are strictly append-only. No row updates or deletions are permitted on posted journals. Corrections require compensating reversal entries.
3. **Orthogonal Financial Dimensions**: Every journal line carries 8 mandatory analytical dimensions:
   - `Country`: `NG` | `NE` | `CROSS_BORDER`
   - `Legal Entity`: `KORIE_NIGERIA_LTD` | `KORIE_NIGER_SA` | `KORIE_HOLDINGS`
   - `Product`: `WALLET_P2P` | `MERCHANT_CHECKOUT` | `AGENCY_BANKING` | `FX_REMITTANCE`
   - `Channel`: `NIP` | `CARD` | `USSD` | `VIRTUAL_ACCOUNT` | `CASH_DESK`
   - `Currency`: `NGN` | `XOF` | `USD`
   - `Provider`: `PROVIDUS_NG` | `KORIS_NE` | `INTERSWITCH` | `NIBSS`
   - `Cost Center`: e.g. `CC_PAYMENT_OPS`, `CC_TREASURY`
   - `Profit Center`: e.g. `PC_MERCHANT_COMMISSIONS`, `PC_FX_SPREAD`
