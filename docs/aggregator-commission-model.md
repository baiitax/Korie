# KORIEPAY AGGREGATOR COMMISSION MODEL
## Revenue Splits, Multi-Tier Calculations & Disbursement Timing

---

## 1. Commission Structure

| Payment Service Rail | Fee Structure | Agent Share | Aggregator Margin | KoriePay Share |
|---|---|---|---|---|
| **Card POS Cash-Out** | 0.5% (Cap ₦500) | 50% | 25% | 25% |
| **Dynamic NUBAN Transfer** | ₦50 Flat | 50% | 30% | 20% |
| **Merchant Acquiring Link** | 1.5% MDR | — | 0.5% | 1.0% |
| **VAS (Airtime / Data / Bills)**| 2.0% Commission | 60% | 25% | 15% |

---

## 2. Commission Settlement Lifecycle

1. **Intraday Accrual:** As transactions complete (`STATUS = SUCCESSFUL`), commission is calculated and credited to the Aggregator's `pendingCommissions` ledger.
2. **Nightly EOD Batch Sweep (23:59 WAT):** The system computes the net daily earnings and issues a NIBSS Direct Credit to the Aggregator's linked Providus Bank account (`0182****29`).
3. **On-Demand Payout:** Aggregator Finance Managers can trigger an instant payout from `/aggregator/wallet` for accrued settled commissions at any time.
