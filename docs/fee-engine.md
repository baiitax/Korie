# Fee Calculation Engine Specification

## 1. Statutory & Regional Fee Structures

### A. Nigeria P2P & NIP Transfers (NGN)
Tiered pricing adhering to Central Bank of Nigeria guidelines + 7.5% statutory VAT:
- Up to ₦5,000: **₦10.00** base fee + ₦0.75 VAT = **₦10.75**
- ₦5,001 to ₦50,000: **₦25.00** base fee + ₦1.88 VAT = **₦26.88**
- Above ₦50,000: **₦50.00** base fee + ₦3.75 VAT = **₦53.75**

### B. Merchant Checkout Processing (MDR)
- Standard Local Card & QR: **1.5%** capped at **₦2,000.00** per transaction.
- International Cards: **3.8%** + ₦100 flat gateway access fee.

### C. Niger Republic Agency & Wallet Transfers (XOF)
- Intra-network P2P: Flat **50 CFA**
- Interbank WAEMU Transfer: **0.5%** capped at **1,500 CFA**

## 2. Double-Entry Fee Accruals
Fees are never subtracted invisibly. A dedicated journal line pair is created for every fee event:
- **Debit**: Customer/Merchant liability account (`2010` / `2050`)
- **Credit**: Fee Revenue account (`4010` / `4030`)
- **Credit (VAT)**: Statutory Tax Liability account (`2110`)
