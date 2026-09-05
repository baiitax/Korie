# KORIEPAY AGGREGATOR SYSTEM MAP
## Multi-Country Financial Network & Distribution Infrastructure
**Country Scope:** Nigeria 🇳🇬 (NGN) & Niger Republic 🇳🇪 (XOF)  
**Primary Banking Nodes:** Providus Bank Nigeria & Coris Bank Niger Republic  

---

## 1. High-Level Architectural Position

```
                               +-------------------------------------+
                               |            KORIEPAY CORE            |
                               |  (Central Ledger, Settlement Node)  |
                               +-------------------------------------+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
   +───────────────────────────+                                     +───────────────────────────+
   |   PROVIDUS BANK NIGERIA   |                                     |    KORIS BANK NIGER REP   |
   |   (NIBSS NIP Settlement)  |                                     |    (BCEAO RTGS Gateway)   |
   +───────────────────────────+                                     +───────────────────────────+
                 │                                                                 │
                 └────────────────────────────────┬────────────────────────────────┘
                                                  ▼
                       +──────────────────────────────────────────────────+
                       |             AGGREGATOR NETWORK LAYER             |
                       |       Sahel Agency & Merchant Distribution       |
                       |                  (AGG-SAHEL-001)                 |
                       +──────────────────────────────────────────────────+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
   +───────────────────────────+                                     +───────────────────────────+
   |   AGENCY BANKING NODES    |                                     |   MERCHANT ACQUIRING      |
   | • 248 Verified Cashpoints |                                     | • 84 Supermarkets/Stores  |
   | • POS Hardware Cash-Out   |                                     | • Dynamic Virtual NUBANs  |
   | • Cash-In & NIP Transfers |                                     | • QR Standees & Slips     |
   +───────────────────────────+                                     +───────────────────────────+
                 │                                                                 │
                 └────────────────────────────────┬────────────────────────────────┘
                                                  ▼
                                      +───────────────────────+
                                      |   END CUSTOMER BASE   |
                                      | (Sahel & West Africa) |
                                      +───────────────────────+
```

---

## 2. Aggregator Command Scope

The Aggregator Portal (`/aggregator`) supervises:
1. **Network Liquidity & Float Pools:** Central float wallet, drawer cash reserves, and instant rebalancing to agency nodes.
2. **Transaction Telemetry:** Multi-channel stream with correlation IDs, error categorization, and deep 7-stage state machine audits.
3. **Multi-Tier Commission Yield:** Split across cash-out, POS withdrawals, and merchant acquiring.
4. **Automated Batch Settlements:** Direct credit clearing to Providus Bank corporate accounts.
5. **Three-Way Double-Entry Reconciliation:** Zero-variance matching between Aggregator Ledger ↔ Banking Nodes ↔ Terminal Slips.
6. **Risk & Fraud Containment:** Velocity spike detectors and hardware lockouts.
