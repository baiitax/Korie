# Dispute & Chargeback Lifecycle Management

## 1. Multi-Stakeholder Dispute Taxonomy
Dispute classifications across Nigeria (NGN) and Niger Republic (XOF):
1. `DUPLICATE_CHARGE`: Customer debited multiple times for a single logical purchase.
2. `UNRECOGNIZED_TRANSACTION`: Potential account takeover or card credential theft.
3. `GOODS_OR_SERVICE_NOT_RENDERED`: Merchant failure to deliver purchased items.
4. `POS_CASH_DISPENSE_ERROR`: Terminal timed out or failed to dispense cash while debiting card.
5. `AGENT_COMMISSION_DISAGREEMENT`: Agency banking cash-in/cash-out fee dispute.

---

## 2. Chargeback Financial Controls & Dispute Reserves
When an external chargeback is received from an acquiring switch (NIBSS, GIM-UEMOA, Interswitch, Visa, Mastercard):
1. **Dispute Hold Applied**: The disputed amount is moved from the merchant's `AVAILABLE` balance to `HELD_DISPUTE_RESERVE`.
2. **Evidence Clock Initiated**: Merchant provided with statutory response countdown (typically 5 to 7 business days).
3. **Representment / Defense**: Merchant submits signed delivery note, receipt hash, and device IP logs.
4. **Resolution Posting**:
   - **Merchant Win**: Dispute reserve released back to `AVAILABLE` balance.
   - **Merchant Loss**: Dispute reserve converted into compensating debit journal to refund cardholder.
