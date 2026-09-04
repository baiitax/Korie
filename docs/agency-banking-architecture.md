# KORIEPAY AGENCY BANKING — ARCHITECTURE & RECONCILIATION SPECIFICATION

## 1. Agency Operating System Pillars
1. **Float & Liquidity Security**: Prevents overdrafting float balance and automatically warns when physical cash drops below safety thresholds (`₦200,000`).
2. **Safe Cash-Out Handover Principle**: Strictly forbids dispensing cash until the banking node confirms `SUCCESSFUL` debit state.
3. **End-of-Day Double-Entry Reconciliation**: Matches opening physical cash, total cash-in deposits, total cash-out withdrawals, and actual counted cash with cryptographically sealed audit logging.
4. **Multilingual Tri-Dialect Support**: Native Hausa (`ha`), English (`en`), and French (`fr`) interface and receipt rendering.
5. **Smart POS Hardware Observability**: Tracks terminal IDs, 4G connectivity, battery charge, thermal printer readiness, and EMV chip readers.

## 2. Agency Route Directory

```
├── /agent                        # Operational Agency Banking Command Center
├── /agent/cash-in                # Fast Customer Deposit & Account Verification
├── /agent/cash-out               # Secure Customer Withdrawal & Cash Dispense
├── /agent/transfer               # NIP & WAEMU Interbank Agency Transfers
├── /agent/customers              # Frequent Walk-in Customer Directory
├── /agent/transactions           # Agency Transaction Audit Log & CSV Statement
├── /agent/commissions            # Real-Time Commission Center & Auto-Sweep
├── /agent/liquidity              # Float Balance Management & Bank Sweeping
├── /agent/reconciliation         # Daily Cash Vault Balancing & Exception Reports
├── /agent/settlement             # Commercial Bank Batch Settlements (Providus)
├── /agent/terminals              # Smart POS Terminal Diagnostics & Battery
├── /agent/support                # Help Desk & Incident Reporting
├── /agent/profile                # Agent Kiosk Profile & Compliance Status
└── /agent/settings               # Agency Interface Language & Controls
```
