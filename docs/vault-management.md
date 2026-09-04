# Vault Management, Compartments & Dual-Custody Governance

## 1. Vault Hierarchy & Architecture
KoriePay supports a multi-tier physical vault hierarchy:
- `CENTRAL_VAULT`: Sovereign treasury cash repository (Lagos / Niamey).
- `REGIONAL_VAULT`: Regional hub buffer vault (Abuja, Kano, Maradi, Zinder).
- `BRANCH_VAULT`: Outpost branch secure room and heavy safe.
- `COMPARTMENTS`: Granular internal sections (e.g., Working Cash Drawer, High-Value Reserve Safe, ATM Cassette Loading Bay, Damaged/Mutilated Banknote Tray).

---

## 2. Dual-Custody (Four-Eyes / Six-Eyes) Access Control
Access to any vault requires simultaneous physical and digital authentication by multiple custodians:
- **Level 1 (Standard Vault Access / Counting)**: `MAKER` (Vault Custodian A) + `CHECKER` (Vault Custodian B).
- **Level 2 (High-Value Transfer > ₦10,000,000 / 25,000,000 XOF)**: `MAKER` + `CHECKER` + `SUPERVISOR` (Branch Manager).
- **No Shared Credentials**: Generic logins (such as `vault-admin`) are strictly blocked. Every access event captures Custodian IDs, biometric/MFA token verification, device attestation, and high-resolution camera timestamp references.
