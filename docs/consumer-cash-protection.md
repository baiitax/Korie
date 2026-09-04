# Consumer Cash Protection, Receipts & Unknown Transaction Recovery

## 1. Consumer Cash Transparency & Protection
1. **Upfront Tariff Presentation**: Customers are shown official fee schedules before physical cash transactions execute. Surcharging above published rates is strictly prohibited.
2. **Cryptographically Verifiable Receipts**: Every physical cash-in / cash-out transaction issues a digital and printed receipt with unique transaction hash and QR code.
3. **Double-Debit / Failed Cash Dispense Protection**:
   - If a customer wallet is debited but terminal hardware crashes before cash handover, the transaction enters `STATE_UNKNOWN`.
   - The Transaction Recovery Engine automatically queries the terminal audit log and agent till position to confirm cash dispense or trigger automatic compensating wallet reversal.
