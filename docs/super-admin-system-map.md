# KORIEPAY SUPER ADMIN — SYSTEM MAP & INTEGRATION MATRIX

## 🏛️ Executive System Map

```
                             KORIEPAY SUPER ADMIN
                                       │
                   ┌───────────────────┼───────────────────┐
                   │                   │                   │
               NIGERIA              NIGER              GLOBAL
                   │                   │                   │
            Providus Bank          Coris Bank        KoriePay Core
                   │                   │                   │
            ┌──────┼──────┐      ┌─────┼──────┐       ┌────┼────┐
            │      │      │      │     │      │       │    │    │
          Agents Merchants BDC  Agents BDC  Customers Wallet API
            │      │      │      │     │      │       │    │
            └──────┴──────┴──────┴─────┴──────┴───────┴────┘
                                   │
                            TRANSACTION ENGINE
                                   │
                         SETTLEMENT / RECONCILIATION
                                   │
                            RISK / COMPLIANCE
                                   │
                              SUPER ADMIN
```

## 🔗 Data Flow Mapping

1. **Database → UI**:
   - `BankingNode` → `src/components/admin/BankingNodeCard.tsx` & `/admin/banking-nodes`
   - `Transaction` (with 10-step lifecycle) → `src/components/admin/EntityDrawer.tsx` & `/admin/transactions`
   - `LedgerEntry` (Double-entry journal) → `/admin/ledger`
   - `ReconciliationException` → `/admin/reconciliation`
   - `MakerCheckerRequest` → `src/components/admin/MakerCheckerModal.tsx`

2. **Provider → Gateway**:
   - **Providus Bank Nigeria Plc**: Interbank NIP, Virtual NUBAN, Webhooks, T+0 Settlement.
   - **Coris Bank SA (Niger Republic)**: WAEMU / GIM-UEMOA Clearing, Bilateral NGN ⇄ XOF Currency Settlement, Maradi/Niamey Treasury.

3. **Risk & Governance**:
   - Dual-Control Maker-Checker Workflow for privileged actions (>₦10M FX Swaps, Wallet Freezes, Settlement Overrides).
