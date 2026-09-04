# KORIEPAY AGGREGATOR WALLET MODEL
## Multi-Tier Float Accounting, Escrows & Dual-Entry Ledger

---

## 1. Wallet Architecture

```text
+-------------------------------------------------------------------------------+
|                       AGGREGATOR MASTER ACCOUNT HIERARCHY                     |
+-------------------------------------------------------------------------------+
| 1. Main Operational Float Wallet    (Available for instant Agent Rebalancing) |
| 2. Collateral Strategic Reserve     (Regulatory Liquidity Minimum)            |
| 3. Unsettled Commission Buffer      (Accrued intraday transaction yield)      |
| 4. Escrow Clearing Pool             (Providus Bank / NIBSS Inbound Funds)     |
+-------------------------------------------------------------------------------+
```

---

## 2. Double-Entry Accounting Examples

### 2.1 Float Top-up of ₦500,000 to Agent `AGT-KN-0104`
```text
DEBIT:   Agent Float Liability Account (AGT-KN-0104)      ₦500,000.00
CREDIT:  Aggregator Master Float Asset Account (AGG-01)   ₦500,000.00
```

### 2.2 Customer Card Cash-Out of ₦100,000 at POS
- Fee: `₦200`
- Agent Commission: `₦100`
- Aggregator Commission: `₦50`
- KoriePay Platform Fee: `₦50`

```text
DEBIT:   Providus Inbound Settlement Asset                ₦100,200.00
CREDIT:  Agent Float Wallet                               ₦100,100.00
CREDIT:  Aggregator Accrued Commission Payable            ₦     50.00
CREDIT:  KoriePay Platform Revenue                        ₦     50.00
```
