# KORIEPAY MERCHANT FINANCIAL OPERATING SYSTEM (FOS)
## Enterprise Multi-Branch & Omni-Channel Payment Infrastructure
**Country Coverage:** Nigeria 🇳🇬 (NGN) & Niger Republic 🇳🇪 (XOF / BCEAO)  
**Primary Banking Nodes:** Providus Bank Nigeria & Coris Bank Niger Republic  
**Target Merchant Tier:** Tier-1 FMCG, Agro-Distributors, Supermarkets, Superstores, and SME Merchants  

---

## 1. System Overview & Architectural Topology

The KoriePay Merchant Financial Operating System is an enterprise commerce rail designed to bridge physical retail POS checkout, automated virtual NUBAN bank transfers, dynamic QR code standees, and digital B2B tax invoicing into a unified double-entry settlement engine.

```
+----------------------------------------------------------------------------------------------------+
|                                    KORIEPAY MERCHANT PORTAL                                        |
|                          (Web / Tablet Cashier / Mobile Native Shell)                              |
+----------------------------------------------------------------------------------------------------+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
   +───────────────────────────+                                     +───────────────────────────+
   |    IN-STORE COLLECTIONS   |                                     |    DIGITAL / REMOTE RAILS |
   |  • Dynamic NUBAN Transfer |                                     |  • Reusable Payment Links |
   |  • Certified PAX/Sunmi POS|                                     |  • B2B Tax Invoicing      |
   |  • Instant NIBSS QR Stand |                                     |  • WhatsApp/SMS Checkout  |
   +───────────────────────────+                                     +───────────────────────────+
                 │                                                                 │
                 └────────────────────────────────┬────────────────────────────────┘
                                                  ▼
                       +──────────────────────────────────────────────────+
                       |           AUTHORITATIVE TRANSACTION LEDGER        |
                       |       (Dual-Entry, Immutable, Event Sourced)     |
                       +──────────────────────────────────────────────────+
                                                  │
                                                  ▼
                       +──────────────────────────────────────────────────+
                       |           NIBSS DIRECT SETTLEMENT ENGINE         |
                       |       Providus Bank Auto-Sweep (Daily 23:59 WAT) |
                       +──────────────────────────────────────────────────+
```

---

## 2. Core Operational Modules

### 2.1 Omni-Channel Payment Collection Center (`/merchant/payments`)
- **Dynamic Bank Transfer (Providus Virtual NUBAN):** Generates dedicated transaction-bound or cashier-bound virtual accounts with sub-3-second webhook settlement verification.
- **Card POS Integration:** Connects seamlessly with physical POS hardware running KoriePay terminal firmware.
- **Dynamic QR Standees:** Supports instant QR generation interoperable with KoriePay App, OPay, PalmPay, Moniepoint, and NIBSS-certified banking apps.

### 2.2 Payment Links Engine (`/merchant/payment-links`)
- **Reusable Links:** Permanent store catalog checkout links with optional customer-defined or fixed payment amounts.
- **Single-Use Links:** Auto-expiring checkout links bound to specific invoices or orders with automatic WhatsApp/SMS dispatch.

### 2.3 Commercial Tax Invoicing (`/merchant/invoices`)
- Complete B2B tax invoicing with automated 7.5% VAT calculation, dynamic Providus settlement NUBAN assignment per invoice, PDF preview, and automated payment status webhooks.

### 2.4 Multi-Branch Network (`/merchant/branches`)
- Support for hierarchical corporate store organizations (e.g., Victoria Island Superstore, Kano Central Distribution Center, Niamey Cross-Border Depot).
- Branch-specific virtual accounts and cashier performance metrics.

### 2.5 Role-Based Access Control (`/merchant/team`)
- **Merchant Owner:** Unrestricted access to ledger, payouts, API secrets, and corporate settings.
- **Finance Manager:** Payout authorization, settlement management, and reconciliation.
- **Branch Manager:** Store-specific sales reporting and terminal device management.
- **Cashier:** Restricted to in-store collection, QR standees, and payment verification.
- **Developer:** API keys, webhook endpoint management, and sandbox logs.
- **Auditor:** Read-only compliance access to ledgers and tax reports.

---

## 3. Financial Settlement & Double-Entry Reconciliation

### 3.1 Settlement Mechanism
1. **Gross Collections:** Aggregated in real-time in the merchant's pending settlement balance.
2. **Platform Fee (MDR):** Deducted automatically at the negotiated Tier-1 rate (1.5% flat).
3. **End-of-Day Sweep:** Triggered at 23:59 WAT via Providus Bank NIP API to the merchant's corporate bank account.
4. **On-Demand Manual Payout:** Allows finance managers to trigger real-time on-demand payouts directly from the Merchant Wallet (`/merchant/wallet`).

### 3.2 Automated Double-Entry Reconciliation (`/merchant/reconciliation`)
- Daily automated 3-way matching between internal transaction hashes, payment gateway logs, and Providus Bank NIP credit statements.
- Instant alert flags for any discrepancy, dropped webhook, or reversal variance.

---

## 4. Internationalization & Regional Localization

| Language Code | Language | Region Supported | Currency Format |
|---|---|---|---|
| `en` | English | Nigeria / International | ₦ 1,000.00 |
| `ha` | Hausa | Northern Nigeria & Niger Republic | ₦ 1,000.00 |
| `fr` | French | Niger Republic / BCEAO UEMOA | 1 000 CFA |

---

## 5. Security & Verification
- **PCI-DSS Level 1 Compliant Card Vault**
- **Dual-Control Maker-Checker Workflow** for high-volume refunds.
- **Masked Data Presentation:** Card PANs, API secret keys, and personal banking identifiers are always masked in the UI.
- **Audit Logging:** Every financial action is timestamped and recorded in the immutable audit ledger.
