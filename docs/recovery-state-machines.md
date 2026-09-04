# Transaction Recovery & Exception State Machines

## 1. Transaction Recovery State Machine

```
   [INITIATED]
        |
        v
   [SUBMITTED] -------- (Timeout / Network Drop) -------> [UNKNOWN]
        |                                                    |
        v                                                    v
    [SUCCESS]                                      [RECOVERY_QUEUED]
        |                                                    |
        |                                       [PROVIDER_STATUS_QUERY]
        |                                         /                 \
        |                      (Confirmed Failed)/                   \(Confirmed Success)
        |                                       /                     \
        |                       [REVERSAL_PENDING]                [POSTING_VERIFIED]
        |                               |                              |
        v                               v                              v
   [COMPLETED]                     [RESOLVED]                     [COMPLETED]
```

---

## 2. Refund State Machine
$$\text{Eligible Refund Amount} = \text{Original Amount} - \sum \text{Refunds} - \sum \text{Reversals}$$

```
   [REFUND_REQUESTED]
        |
        v
   [ELIGIBILITY_CHECK] ---> (Exceeds Remaining?) ---> [REJECTED]
        |
   (Eligible)
        v
   [APPROVAL_PENDING] (Maker-Checker / Risk Scan)
        |
   (Approved)
        v
   [SUBMITTED_TO_PROVIDER]
        |
   (Provider OK)
        v
   [LEDGER_POSTED] ---> [SETTLEMENT_UPDATED] ---> [REFUND_COMPLETED]
```
