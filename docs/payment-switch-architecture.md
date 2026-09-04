# Payment Switch Architecture & Orchestration Layer

## 1. Architectural Mission
The **KoriePay Payment Orchestration & Switch Layer** serves as the high-throughput, fault-tolerant execution gateway connecting customers, agents, merchants, and aggregators across **Nigeria (NGN)** and **Niger Republic (XOF)** to banking partner nodes and payment clearing switches.

### Golden Rule Distinction
```
PAYMENT SWITCH       = Execution & Routing Truth
LEDGER               = Monetary Truth
GENERAL LEDGER       = Accounting & Reporting Truth
RECONCILIATION       = External-vs-Internal Truth Verification
TREASURY             = Liquidity & Funding Truth
```

A provider response of `SUCCESS` indicates execution completion; it does not replace internal double-entry financial posting, settlement disbursement, or bank statement reconciliation.

---

## 2. End-to-End Orchestration Flow

```
                 PAYMENT INITIATION REQUEST
                            │
                            ▼
                  [1] Authentication & IAM
                            │
                            ▼
                  [2] Idempotency Assertion
                    (Scope + Key + Request Hash)
                            │
                            ▼
                  [3] Fraud & Risk Evaluation
                     (14-step scoring pipeline)
                            │
                            ▼
                  [4] Routing Engine Selection
                  (Capabilities, Health, Cost, SLA)
                            │
                            ▼
               [5] Create Payment & Attempt #1
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
         [Provider A]               [Provider B]
      (Providus Bank NG)        (Koris Bank Niger SA)
               │                         │
               └────────────┬────────────┘
                            │
                            ▼
               [6] Status Normalization Engine
             (Standardized internal state machine)
                            │
                            ▼
               [7] Core Financial Journal Post
                (Atomic Double-Entry Ledger)
                            │
                            ▼
               [8] Settlement & Outbox Dispatch
```

---

## 3. Payment vs. Payment Attempt Separation
1. **Payment (`payments`)**: The business transaction representing the financial commitment between parties.
2. **Payment Attempt (`payment_attempts`)**: A specific, numbered physical network transmission against an external provider gateway.
   - If Attempt #1 times out, the Payment remains in `PENDING/UNKNOWN` state while Attempt #1 is recorded as `TIMEOUT`.
   - Subsequent safe retries create Attempt #2 without destroying Attempt #1's diagnostic audit history.
