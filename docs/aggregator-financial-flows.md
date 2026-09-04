# KORIEPAY AGGREGATOR FINANCIAL FLOWS
## Capital Circulation, Float Injection, POS Clearing & Settlement Routes

---

## 1. Capital Circulation Topology

```
+----------------------------------------------------------------------------------------------------+
|                                    KORIEPAY TREASURY ESCROW                                        |
+----------------------------------------------------------------------------------------------------+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
   +───────────────────────────+                                     +───────────────────────────+
   |  AGGREGATOR MAIN WALLET   |                                     |    RESERVE / ESCROW POOL  |
   | (Available for Float Inj) |                                     |  (Collateral Requirements)|
   +───────────────────────────+                                     +───────────────────────────+
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
   +───────────────────────────+   +───────────────────────────+
   |     AGENT WALLET FLOAT    |   |  MERCHANT SETTLEMENT ESCROW|
   | (Used for Cash-Out/Trans) |   | (Daily Revenue Accumulator)|
   +───────────────────────────+   +───────────────────────────+
                 │                               │
                 ▼                               ▼
   +───────────────────────────+   +───────────────────────────+
   |   CUSTOMER CASH DISPENSE  |   | PROVIDUS BANK NIGHTLY EOD |
   +───────────────────────────+   +───────────────────────────+
```

---

## 2. Real-Time Float Rebalancing Lifecycle

1. **Threshold Monitoring:** Background event listener evaluates agent balances against territory minimum (`₦250,000`).
2. **Exception Raised:** If float drops below minimum, an `EXC-WALLET` record is queued in `/aggregator/exceptions`.
3. **Maker Authorization:** Aggregator operator triggers `/aggregator/liquidity` float injection modal with a 4-digit security PIN.
4. **Ledger Execution:**
   - `DEBIT`: Aggregator Main Float Wallet (`2010`)
   - `CREDIT`: Agent Float Wallet (`2020`)
5. **Instant Clearing:** Real-time push notification and POS telemetry update sent to the agent's PAX terminal.
