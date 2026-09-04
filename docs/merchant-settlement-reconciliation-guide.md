# KORIEPAY MERCHANT SETTLEMENT & RECONCILIATION GUIDE
## Financial Engine, NIBSS Direct Clearing & Double-Entry Accounting

---

## 1. Settlement Topology & Provider Routing

KoriePay routes settlements through tier-1 banking institutions:
1. **Nigeria Rails (NGN):** Providus Bank NIP Settlement Gateway.
2. **Francophone West Africa Rails (XOF):** Koris Bank Niger Republic / BCEAO RTGS.

```
+----------------------------------------------------------------------------------------------------+
|                                    CUSTOMER PAYMENT INITIATION                                      |
|                             (Dynamic Transfer, POS Card, QR Standee)                               |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
                        +───────────────────────────────────────────────────+
                        |           KORIEPAY REAL-TIME INGESTION NODE       |
                        |      (Validates webhook, updates ledger entry)    |
                        +───────────────────────────────────────────────────+
                                                  │
                                                  ▼
                        +───────────────────────────────────────────────────+
                        |             MERCHANT AVAILABLE BALANCE            |
                        |          Gross - 1.5% MDR Fee = Net Settled       |
                        +───────────────────────────────────────────────────+
                                                  │
                                                  ├───────────────────────────────┐
                                                  ▼                               ▼
                      +──────────────────────────────────────+      +──────────────────────────────+
                      |       AUTO-SWEEP (Daily 23:59 WAT)    |      |    ON-DEMAND MANUAL PAYOUT   |
                      |  Batch push to Providus Bank Account |      |    Instant NIP transfer      |
                      +──────────────────────────────────────+      +──────────────────────────────+
```

---

## 2. Double-Entry General Ledger Structure

Every transaction generates balanced double-entry accounting records:

### 2.1 Customer Bank Transfer of ₦100,000 (1.5% Fee)
```
DEBIT:   Providus Inbound Escrow Asset Account (1010)       ₦100,000.00
CREDIT:  Merchant Available Settlement Payable (2010)        ₦98,500.00
CREDIT:  KoriePay Merchant Platform Fee Revenue (4010)       ₦1,500.00
```

### 2.2 End-of-Day Settlement Sweep of ₦98,500 to Merchant Providus Account
```
DEBIT:   Merchant Available Settlement Payable (2010)        ₦98,500.00
CREDIT:  Providus Bank Liquidity Settlement Asset (1020)     ₦98,500.00
```

---

## 3. Discrepancy Matching & Resolution

The reconciliation engine verifies three vectors:
1. **Merchant Internal Order Hash**
2. **Provider Settlement Node (Providus Bank / Interswitch / BCEAO)**
3. **NIBSS Session Reference ID**

If a mismatch is identified (e.g., dropped provider webhook or reversed network transmission), the transaction is flagged with an `INVESTIGATION_REQUIRED` status and surfaced on the Reconciliation Dashboard (`/merchant/reconciliation`) for one-click audit resolution.
