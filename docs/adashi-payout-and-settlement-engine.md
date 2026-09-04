# Adashi Payouts, Disbursement & Dual-Control Ledger Integration

## 1. Payout Calculation & Fee Breakdown

Total Pool Disbursement is computed according to product configuration:

$$\text{Gross Payout} = \text{Contribution Obligation per Member} \times \text{Number of Contributing Members}$$
$$\text{Platform Commission} = \text{Gross Payout} \times \text{Platform Fee \%}$$
$$\text{Agent Commission} = \text{Gross Payout} \times \text{Agent Fee \%}$$
$$\text{Net Beneficiary Payout} = \text{Gross Payout} - (\text{Platform Commission} + \text{Agent Commission})$$

---

## 2. Payout Guardrails & Maker-Checker

Payouts are protected by multi-tier guardrails:
1. **Full Collection Verification**: By default, payout requires 100% of cycle obligations to be in status `PAID`. If partial payout is allowed, shortfalls are capped at 1 member contribution and flagged for risk reserve coverage.
2. **Dual-Authorization Threshold**: Any payout exceeding $\ge 500,000\text{ NGN}$ or $\ge 500,000\text{ XOF}$ requires Super Admin Maker-Checker dual authorization before ledger release.
3. **Core Ledger Double-Entry Booking**:
   - `DR: Adashi Vault Escrow Account (Custodial Liability Account)`
   - `CR: Beneficiary Customer Wallet (Customer Balance)`
   - `CR: KoriePay Fee Income Account (Platform Revenue)`
   - `CR: Agent Commission Payable Account (Liability)`
