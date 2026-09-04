# KORIEPAY DEVELOPER SANDBOX SIMULATOR & TEST INSTRUMENTS

## 1. Sandbox Purpose
The KoriePay Sandbox is a high-fidelity isolated testnet that models Providus Bank Nigeria and Koris Bank Niger Republic transaction lifecycles without moving real funds.

---

## 2. Test Payment Instruments

### Cards
- **Verve Debit (NGN)**: `5061 9920 3819 0012` (CVV `123`, PIN `1234`) -> SUCCESS
- **Visa WAEMU (XOF)**: `4111 2233 4455 6677` (CVV `456`, PIN `0000`) -> SUCCESS
- **Insufficient Funds**: `5061 9900 0000 4001` -> HTTP 400 INSUFFICIENT_FUNDS
- **Sanction Flagged**: `4111 0000 0000 4031` -> HTTP 403 SANCTION_FLAGGED

### Virtual Accounts
- **Providus Bank Nigeria**: `9928193820` (NGN)
- **Koris Bank Niger Republic**: `22798102391` (XOF)
