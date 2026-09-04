# KORIEPAY AGENCY BANKING — SYSTEM INTEGRATION MAP

## 1. End-to-End Agency Banking Pipeline

```
Agent POS / Terminal
        ↓
Agent Authentication & PIN Verification
        ↓
Agent Wallet Float Balance Check
        ↓
Customer Account Verification (10-Digit NUBAN / IBAN Inquiry)
        ↓
Transaction Dispatch (Cash-In, Cash-Out, Transfer, Bills)
        ↓
KoriePay Core Router
        ↓
Banking Provider Node (Providus Bank 🇳🇬 / Koris Bank 🇳🇪)
        ↓
Provider Webhook Callback & HMAC Signature Check
        ↓
Double-Entry Ledger Update
        ↓
Commission Calculation & Immediate Payout
        ↓
Physical Cash & Float Reconciliation
        ↓
Thermal & Digital Receipt Generation (Selectable Language EN/HA/FR)
```

## 2. Liquidity & Float Model
- **Wallet Float**: Digital clearing balance hosted at Providus Bank (Nigeria) or Koris Bank (Niger Republic).
- **Physical Cash in Hand**: Vault currency held at agency kiosk for cash-out disbursements.
- **Total Operational Liquidity**: `Wallet Float + Physical Cash in Hand`.
- **Cash-In Operation**: Collects physical cash (+CashInHand), debits wallet float (-WalletFloat), credits customer bank account.
- **Cash-Out Operation**: Debits customer bank account, credits wallet float (+WalletFloat), dispenses physical cash (-CashInHand).
