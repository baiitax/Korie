# KORIEPAY AGGREGATOR SETTLEMENT MODEL
## NIBSS Direct Credit, Providus Bank NG & Coris Bank NE Clearing

---

## 1. Settlement Rails

- **Nigeria (NGN):** Providus Bank NIP Settlement Gateway & NIBSS Instant Payments.
- **Niger Republic (XOF):** Coris Bank Niger Republic / BCEAO RTGS.

---

## 2. Daily Batch Settlement Process

```
[Intraday Transactions] ──► [Ledger Calculation] ──► [Interchange Deductions] ──► [NIBSS Batch] ──► [Providus Bank Credit]
```

1. **Transaction Accumulation:** 00:00:00 – 23:58:59 WAT.
2. **Gross Volume Summation:** Total volume processed by all assigned network agents and acquired merchants.
3. **Fee & Refund Netting:** Platform MDR interchange and approved customer reversals deducted.
4. **Direct Credit Dispatch:** Providus NIP batch transferred directly with verified session ID.
