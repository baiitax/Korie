# Account Restrictions & Maker-Checker Dual Control Architecture

## Restriction Types
1. **`TOTAL_FREEZE`**: Complete freeze on incoming credits and outgoing debits. Applied under court orders or confirmed OFAC/UN sanctions matches.
2. **`DEBIT_SUSPENSION` (Post-No-Debit / PND)**: Credits permitted, but all withdrawals, card payments, and transfers blocked pending KYC/AML remediation.
3. **`SETTLEMENT_HOLD`**: Payouts to merchant settlement accounts paused while transactions undergo fraud / chargeback review.
4. **`TRANSACTION_LIMIT`**: Dynamic velocity ceiling applied to reduce exposure on high-risk accounts.

## Maker-Checker Authorization Protocol
- **Maker (Initiator)**: Compliance Analyst or Fraud Investigator files the restriction request with legal rationale and supporting court order/alert reference.
- **Checker (Authorizer)**: MLRO or Head of Compliance must inspect the justification and sign off. The ledger enforcement node executes the restriction only upon dual authorization.
- **Lifting Protocol**: Unfreezing requires mandatory audit documentation stating the dismissal rationale (e.g. court order vacated, full Source of Funds established).
