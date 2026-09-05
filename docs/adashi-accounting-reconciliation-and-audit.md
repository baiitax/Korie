# Adashi Accounting, Custodial Reconciliation & Audit Architecture

## 1. Zero-Variance Escrow Balancing

The Adashi Escrow Vault is a dedicated balance-sheet custodial account held per currency (`ESCROW_VAULT_NGN_01`, `ESCROW_VAULT_XOF_01`).

$$\sum \text{Member Contributions} - \sum \text{Beneficiary Payouts} - \sum \text{Platform \& Agent Fees} = \text{Escrow Ledger Balance}$$

Every 24 hours, the `AdashiReconciliationEngine` performs deterministic 3-way balance verification:
1. **Adashi Operational Aggregate**: Sum of all `adashi_contribution_obligations.status = 'PAID'` minus sum of `adashi_payouts.status = 'COMPLETED'`.
2. **Core Ledger Escrow Account Balance**: Gl balance on `KORIEPAY_ESCROW_ADASHI_VAULT`.
3. **Physical Bank Settlement Account Balance**: Total custodial cash deposited at Providus Bank (NGN) / Coris Bank (XOF).

---

## 2. Audit Trail & Regulatory Reporting

All state modifications generate an immutable audit log entry in `adashi_audit_events`:
- Timestamp (UTC ISO 8601)
- Operator ID (Customer, Agent, or Admin ID)
- Action Name (`LOCK_MEMBERSHIP`, `GENERATE_ROTATION`, `DISBURSE_PAYOUT`, `FLAG_DEFAULT`)
- State Snapshot (Before & After JSON payloads)
- Digital Hash & Correlation ID
