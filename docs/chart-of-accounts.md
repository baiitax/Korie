# Chart of Accounts (COA) Master Specification

## 1. Numbering Scheme & Account Classes

| Account Code Range | Category | Normal Balance | Description |
|---|---|---|---|
| **1000 - 1999** | Assets | Debit | Cash in Bank, Provider Clearing, Settlement Receivables, Customer Overdrafts |
| **2000 - 2999** | Liabilities | Credit | Customer Wallets, Merchant Undisbursed Settlements, Agent Float Deposits |
| **3000 - 3999** | Equity | Credit | Retained Earnings, Shareholder Capital |
| **4000 - 4999** | Revenue | Credit | Transaction Processing Fees, FX Remittance Spread, Gateway Interchange |
| **5000 - 5999** | Expenses | Debit | Banking Switch Fees, NIBSS Session Charges, SMS Gateway Costs |
| **6000 - 6999** | Clearing | Zero-Balance | In-flight Switch Clearing, Cross-Border Nostro/Vostro Transit |
| **7000 - 7999** | Suspense | Zero-Balance | Unreconciled Inflows, Provider Exceptions, Dispute Holds |

---

## 2. Core Ledger Accounts Catalog
- `1010`: Cash & Bank - Providus Bank Operational Settlement (NGN)
- `1020`: Cash & Bank - Coris Bank Operational Reserve (XOF)
- `1100`: Clearing - Inward Virtual Account Collections (NGN)
- `1110`: Clearing - Inward Sahel Collections (XOF)
- `1200`: Settlement Receivables - Interswitch Gateway
- `2010`: Customer Stored-Value Wallets (NGN)
- `2020`: Customer Stored-Value Wallets (XOF)
- `2100`: Merchant Undisbursed Payables (NGN)
- `2110`: Merchant Undisbursed Payables (XOF)
- `4010`: Processing Fee Revenue - Local Transfers
- `4020`: Processing Fee Revenue - Merchant Checkout MDR
- `4030`: FX Margin & Spread Revenue
- `5010`: Bank Processing Fees - Providus NIP
- `5020`: Switch Fees - NIBSS / GIM-UEMOA
- `7010`: Operational Suspense - Unmatched Webhook Credits
- `7020`: Settlement Exception Suspense
