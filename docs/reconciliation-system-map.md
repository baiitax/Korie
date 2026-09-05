# KoriePay Reconciliation & Settlement Engine — System Map

## 1. System Overview
The KoriePay Reconciliation & Settlement Engine is a Tier-1 financial verification and funds disbursement platform designed for dual-jurisdiction operations in Nigeria (NGN) and Niger Republic (XOF).

```
                      ┌─────────────────────────────────────────┐
                      │    API Gateway / User Channels Layer    │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │      Transaction Engine & Outbox        │
                      └──────────────┬───────────────────┬──────┘
                                     │                   │
                                     ▼                   ▼
                      ┌──────────────────────┐   ┌──────────────────────┐
                      │  Double-Entry Ledger │   │   Provider Adapters  │
                      │  (Financial Truth)   │   │  (Providus & Coris)  │
                      └──────────────┬───────┘   └───────────┬──────────┘
                                     │                       │
                                     ▼                       ▼
                      ┌─────────────────────────────────────────┐
                      │    Canonical Record Normalizer Layer    │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    Configurable 5-Level Match Engine    │
                      └──────────────┬───────────────────┬──────┘
                                     │                   │
                  ┌──────────────────┴──┐             ┌──┴──────────────────┐
                  ▼                     ▼             ▼                     ▼
            [ Exact Match ]     [ Composite Match ] [ Partial Match ]  [ Exception Queue ]
                  │                     │             │                     │
                  └──────────────────┬──┴─────────────┴─────────────────────┘
                                     ▼
                      ┌─────────────────────────────────────────┐
                      │     Settlement & Eligibility Engine     │
                      │   Gross - Fees - Reserves = Net Payable │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │   Suspense Aging & Maker-Checker Desk   │
                      └─────────────────────────────────────────┘
```

## 2. Distinct Separation of Financial Truths
To avoid state confusion, KoriePay separates 12 distinct financial entities:
1. **Business Transaction**: The customer/agent/merchant commercial intent.
2. **Transaction Attempt**: Individual network calls made to execute the transaction.
3. **Internal Ledger Posting**: Authoritative immutable double-entry journal entry.
4. **Account Balance**: Real-time derived projection of posted debits and credits.
5. **Provider Transaction**: The transaction record acknowledged by Providus or Coris.
6. **Provider Settlement**: The provider's internal clearing confirmation.
7. **Bank Statement Movement**: The external cash movement on the commercial bank statement.
8. **Settlement Batch**: Grouped net payout instruction for merchants/agents.
9. **Reconciliation Result**: Deterministic match outcome and confidence score.
10. **Reconciliation Exception**: Quarantined discrepancy requiring operational review.
11. **Resolution Record**: Authorized explanation and evidence for an exception.
12. **Accounting Adjustment**: Compensating double-entry journal created via Maker-Checker.
