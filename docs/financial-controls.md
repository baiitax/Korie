# Financial Controls & Continuous Invariants

## 1. Continuous Invariant Assertions
The KoriePay financial daemon continuously validates 5 critical invariants every 60 seconds:
1. **Ledger Zero-Imbalance Assertion**:
   $$\sum \text{All Debit Lines} - \sum \text{All Credit Lines} \equiv 0$$
2. **Customer Funds Segregation (Proof of Reserve)**:
   $$\text{Cash in Providus (1010)} + \text{Cash in Coris (1020)} \ge \text{Customer Wallet Liabilities (2010 + 2020)}$$
3. **Negative Balance Proscription**: No customer or merchant liability account may hold a debit-leaning balance unless backed by an authorized overdraft line.
4. **Idempotency Guarantee**: No duplicate journal entries may share the same `idempotency_key`.
5. **Chart of Accounts Integrity**: All journal lines reference active, recognized COA codes.
