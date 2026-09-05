# Payment Switch to Finance Ledger Integration

## 1. Architectural Handshake
The Payment Switch communicates with the General Ledger using transactional events and subledger reservation locks:
1. **Initiation**: When a payment is initiated, the Payment Switch requests an **Idempotent Reservation Lock** on the customer subledger wallet.
2. **Execution**: The switch routes to Providus/Coris and records attempt logs.
3. **Settlement & Posting**: Upon receipt of positive confirmation or webhook, the switch emits `PAYMENT_COMPLETED` event.
4. **Journal Generation**: The General Ledger Engine processes the event, creates a balanced journal entry with 8 dimensions, commits balances atomically, and marks the payment's financial state as `POSTED`.
5. **Reversal Handler**: In the event of execution failure after debit, a compensating `PAYMENT_CANCELLED` event posts an automated refund journal.
