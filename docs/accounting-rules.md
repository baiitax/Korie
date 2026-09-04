# Accounting Rule Engine Specification

## 1. Concept and Purpose
The Accounting Rule Engine decouples business product logic (Transfers, Checkout, Agency, Cross-border) from accounting postings. It ensures all financial transactions map to balanced debit and credit journal templates.

## 2. Versioned Accounting Rules
Accounting rules are versioned (`v1`, `v2`, etc.) and require formal approval from the Chief Financial Officer before becoming active in production.

### Rule 1: Customer P2P Wallet Transfer (Nigeria)
- **Rule Code**: `RULE_NGN_P2P_TRANSFER_v1`
- **Debit**: `2010` Customer Wallet Deposits NGN (Reduces sender liability)
- **Credit**: `2010` Customer Wallet Deposits NGN (Increases receiver liability)
- **Fee Debit**: `2010` Customer Wallet Deposits NGN (Sender pays fee)
- **Fee Credit**: `4010` Transfer Processing Fee Income NGN (Platform fee revenue)

### Rule 2: Merchant Web Checkout Collection
- **Rule Code**: `RULE_MERCHANT_CHECKOUT_NGN_v1`
- **Debit**: `1010` Providus Settlement Pool NGN (Gross funds received from bank)
- **Credit**: `2050` Merchant Payables NGN (Net merchant payable liability)
- **Fee Credit**: `4030` Merchant MDR Checkout Fee Income (Platform MDR take)

### Rule 3: Agency Cash-In Deposit
- **Rule Code**: `RULE_AGENCY_CASH_IN_v1`
- **Debit**: `2030` Agent Operational Float NGN (Float debited from agent)
- **Credit**: `2010` Customer Wallet Deposits NGN (Customer wallet credited)
- **Commission Debit**: `5030` Agent Distribution Commission Expense (Expense)
- **Commission Credit**: `2030` Agent Operational Float NGN (Agent receives commission)
- **Platform Fee Credit**: `4050` Agency Commission Revenue (Platform take)

### Rule 4: Bilateral Cross-Border Remittance (NGN ➔ XOF)
- **Rule Code**: `RULE_CROSS_BORDER_NG_NE_v1`
- **Leg 1 (NGN)**:
  - Debit: `2010` Customer Wallet Deposits NGN (Sender debit)
  - Credit: `6010` Cross-Border FX Bridge Clearing (Bridge liability)
  - Credit: `4040` FX Spread Revenue (Spread margin)
- **Leg 2 (XOF)**:
  - Debit: `6010` Cross-Border FX Bridge Clearing (Bridge debit)
  - Credit: `2020` Customer Wallet Deposits XOF (Receiver credit in Niger)
