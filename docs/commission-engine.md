# Commission Distribution Engine Specification

## 1. Multi-Tier Agency Commission Models
In agency banking networks across Nigeria and Niger Republic, transaction fees are split automatically between the physical agent, the regional aggregator, and the platform.

### Commission Split Rules
| Transaction Type | Customer Fee | Agent Share | Aggregator Share | KoriePay Platform Share |
|---|---|---|---|---|
| **Cash-In Deposit** | ₦100 flat | ₦60 (60%) | ₦10 (10%) | ₦30 (30%) |
| **Cash-Out Withdrawal** | 1.0% | 0.6% (60%) | 0.1% (10%) | 0.3% (30%) |
| **Bill Payment / Airtime** | 2.0% | 1.2% (60%) | 0.2% (10%) | 0.6% (30%) |

## 2. Double-Entry Commission Postings
- **Debit**: `5030` Agent Distribution Commission Expense (Expense)
- **Credit**: `2030` Agent Operational Float NGN (Agent liability increased)
- **Credit**: `2040` Aggregator Commission Payable (Aggregator float credited)
- **Credit**: `4050` Agency Commission Revenue (Platform net take)
