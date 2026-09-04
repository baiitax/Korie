# Holds and Reserves Engine Specification

## 1. Overview
The Holds & Reserves Engine manages temporary balance reservations without modifying posted double-entry ledger history. This prevents double-spending during asynchronous bank payouts and enforces regulatory dispute reserves.

## 2. Hold Reason Codes
| Hold Code | Purpose | Typical Expiration | Auto-Release Action |
|---|---|---|---|
| `PENDING_PAYMENT` | Outbound bank transfer in-flight | 5 minutes | Release if bank rejects; Capture if bank confirms |
| `RISK_HOLD` | Anti-fraud velocity anomaly flag | 24 - 48 hours | Requires Compliance Officer Maker-Checker review |
| `COMPLIANCE_HOLD` | Sanctions or PEP review hold | 72 hours | Requires Legal / AML Sign-off |
| `CHARGEBACK_RESERVE` | Contested card or merchant claim | 14 days | Capture if merchant loses; Release if dispute resolved |
| `SETTLEMENT_RESERVE` | Rolling 5% merchant risk reserve | 30 - 90 days | Scheduled rolling release to merchant account |

## 3. Atomic Hold Lifecycle
1. **Place Hold**: Locks `amount` in `account_holds`. Reduces `available_balance` while `calculated_balance` remains constant.
2. **Release Hold**: Returns held funds to `available_balance`.
3. **Capture Hold**: Triggers Double-Entry Ledger Posting (`DoubleEntryLedgerEngine.postJournalEntry`) and marks hold as `CAPTURED`.
