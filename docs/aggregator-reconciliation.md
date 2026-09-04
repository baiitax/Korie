# KORIEPAY AGGREGATOR RECONCILIATION
## Three-Way Automated Reconciliation, Variance Detection & Exception Resolution

---

## 1. The Three-Way Reconciliation Model

```
                +──────────────────────────────────────+
                |     INTERNAL AGGREGATOR LEDGER       |
                |   (Recorded Transactions & Floats)   |
                +──────────────────────────────────────+
                                   ▲
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
+──────────────────────────────+       +──────────────────────────────+
|   BANKING NODE STATEMENT     |       |    PHYSICAL TERMINAL AUDIT   |
| (Providus Bank / Koris Bank) |◄─────►|    (PAX / Sunmi POS Slips)   |
+──────────────────────────────+       +──────────────────────────────+
```

---

## 2. Discrepancy Classification

| Discrepancy Type | Root Cause | Automated Resolution Flow |
|---|---|---|
| **Missing Provider Webhook** | Intermittent telecom timeout | Ingested via periodic Providus NIP status poller |
| **Reversal Mismatch** | Late terminal timeout reversal | Reversal journal posted to Agent Float ledger |
| **Float Variance** | Unconfirmed cash deposit at branch | Flagged on `/aggregator/exceptions` for Field Lead check |
| **Zero Variance** | All records 100% matched | Marked as `BALANCED` with signed cryptohash |
