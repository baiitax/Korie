# KoriePay Reconciliation & Settlement Engine — Financial Flow Map

## 1. 4-Way Reconciliation Flow
```
[ Ingest Sources ] ──► [ Internal Ledger ] + [ Transaction Logs ] + [ Provider Feeds ] + [ Bank Statements ]
                                │
                                ▼
[ Normalization ]  ──► Canonical Reconciliation Records (Integer Minor Units, ISO 8601)
                                │
                                ▼
[ 5-Level Matching ] ─► L1: Exact Reference (100% confidence)
                   ─► L2: External Gateway Ref (100% confidence)
                   ─► L3: Composite Match (Amount + Date + Account) (85% confidence)
                   ─► L4: Settlement Batch Match (80% confidence)
                   ─► L5: Controlled Fuzzy Match (Manual Confirmation Required)
                                │
                                ├────────────────────────┬────────────────────────┐
                                ▼                        ▼                        ▼
                        [ Exact Match ]          [ Partial Match ]         [ Exception ]
                                │                        │                        │
                                ▼                        ▼                        ▼
                        [ Mark Matched ]         [ Split Line & Settle ]   [ Quarantined to Suspense ]
                                                                                  │
                                                                                  ▼
                                                                           [ Work Queue & SLA ]
                                                                                  │
                                                                                  ▼
                                                                           [ Maker-Checker ]
```

## 2. Settlement Eligibility & Net Payout Lifecycle
```
[ Trigger Settlement ] ──► Compute Gross Eligible Volume for Period
                                 │
                                 ▼
[ Calculate Deductions ] ──► Minus: Platform MDR Fees
                        ──► Minus: Statutory Taxes (VAT 7.5% in NG)
                        ──► Minus: Refunds & Chargeback Claims
                        ──► Minus: Rolling Risk Reserves (5%)
                        ──► Minus: Active Dispute Holds
                                 │
                                 ▼
[ Assert Net Balance ]   ──► Assert Net Payable > 0
                                 │
                                 ▼
[ Maker Review ]         ──► Settlement Analyst submits Batch (PENDING_REVIEW)
                                 │
                                 ▼
[ Checker Approval ]     ──► Finance Director approves (APPROVED)
                                 │
                                 ▼
[ Double-Entry Journal ] ──► Post JE: Debit 2050 (Payables), Credit 1010 (Bank Pool)
                                 │
                                 ▼
[ Bank Rail Execution ]  ──► Dispatch NIP outward transfer instruction to Bank
                                 │
                                 ▼
[ Final Confirmation ]   ──► Reconciled against Bank MT940 statement (SETTLED)
```
