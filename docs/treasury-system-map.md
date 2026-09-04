# Treasury & Liquidity System Map

## 1. Architectural Mission
The **KoriePay Treasury & Liquidity Management Engine** serves as the authoritative financial control center responsible for multi-country, multi-currency cash positioning, bank account float monitoring, settlement obligation matching, rolling liquidity forecasting, and stress simulation across **Nigeria (Providus Bank - NGN)** and **Niger Republic (Koris Bank - XOF)**.

---

## 2. Fundamental Treasury Architecture

```
                             DOUBLE-ENTRY GENERAL LEDGER
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         │                                │                                │
         ▼                                ▼                                ▼
  Bank Balances                   Provider Balances                Customer Liabilities
  [Node 1010/1020]                [Node 1030/1040]                 [Node 2010/2020]
         │                                │                                │
         │                                │                                │
         ▼                                ▼                                ▼
  Merchant Payables               Agent Float Nodes                Settlement Reserves
  [Node 2050]                     [Node 2030]                      [Node 2060]
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                                          ▼
                                   TREASURY ENGINE
                                          │
               ┌──────────────────────────┼──────────────────────────┐
               ▼                          ▼                          ▼
      Liquidity Monitoring        Funding Planning          FX & Corridor Exposure
      (Real-time Position)       (4-Eyes Rebalancing)        (NGN / XOF Books)
               │                          │                          │
               └──────────────────────────┼──────────────────────────┘
                                          │
                                          ▼
                                 LIQUIDITY DECISION
                                          │
                                          ▼
                         EXECUTION (NIP / WAEMU RTGS / BANK)
```

---

## 3. Account Hierarchy & Nodes
1. **Asset Accounts (1000 Series)**:
   - `1010`: Providus Bank Nigeria Settlement Vault (NGN)
   - `1020`: Koris Bank Niger Republic Settlement Vault (XOF)
   - `1030`: Card & Checkout Aggregator Float (NGN)
   - `1040`: In-Flight Clearing & Settlement Inflow (Multi-currency)
2. **Liability Accounts (2000 Series)**:
   - `2010`: Customer Digital Wallet Liabilities (NGN)
   - `2020`: Customer Digital Wallet Liabilities (XOF)
   - `2030`: Agent Working Float Liabilities (NGN)
   - `2040`: Agent Working Float Liabilities (XOF)
   - `2050`: Merchant Undisbursed Settlements (NGN)
   - `2060`: Merchant Rolling Reserve Hold (5% Risk Buffer)
3. **Suspense Accounts (7000 Series)**:
   - `7100`: Unallocated Collections
   - `7200`: In-Flight / Failed Clearing Discrepancies
   - `7300`: Settlement Variance Suspense
