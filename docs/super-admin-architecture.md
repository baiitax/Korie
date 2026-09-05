# KORIEPAY SUPER ADMIN — ARCHITECTURE SPECIFICATION

## 1. System Philosophy
KoriePay Super Admin is designed as a centralized Financial Operations + Banking Control + Risk + Compliance + Reconciliation + Treasury + Infrastructure Intelligence Center.

## 2. Key Architecture Pillars
- **Strict Data-Driven UI**: All metrics, statuses, and logs derive from strongly typed schemas (`src/types/admin.ts`) and unified service layer (`src/services/adminDataService.ts`).
- **Bilateral Financial Sovereignty**:
  - Nigeria Market Node: Providus Bank Gateway (`providus_ng`), NGN ₦ currency, NIP rails.
  - Niger Republic Market Node: Coris Bank Gateway (`koris_ne`), XOF CFA currency, WAEMU rails.
  - Global Cross-Border Core: Bilateral corridor router with sub-3s clearing.
- **Universal Entity Inspection**: Slide-in Glass Drawer allowing deep inspection of any Transaction, Customer, Agent, Merchant, or BDC entity without losing context.
- **Dual-Control Governance (Maker-Checker)**: High-risk actions require explicit two-party administrative authorization before ledger or wallet mutations take effect.
