# Customer & Account Lifecycle Architecture

## 1. Domain Separation Model
The KoriePay Customer and Banking Product platform establishes an orthogonal separation of concerns:

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   IDENTITY  │ ----> │     KYC     │ ----> │   CUSTOMER  │ ----> │   ACCOUNT   │
│  Who is the │       │  Verified   │       │  Contractual│       │  Financial  │
│  entity?    │       │  Evidence   │       │  Subject    │       │  Subledger  │
└─────────────┘       └─────────────┘       └─────────────┘       └──────┬──────┘
                                                                         │
                      ┌─────────────┐       ┌─────────────┐              │
                      │    POLICY   │ <---- │   PRODUCT   │ <────────────┘
                      │  Rules and  │       │ Configurable│
                      │  Limits     │       │ Proposition │
                      └─────────────┘       └─────────────┘
```

---

## 2. Customer Master Lifecycle
Customers progress through controlled state transitions:

```
PROSPECT ──> APPLICATION_STARTED ──> KYC_PENDING ──> KYC_VERIFIED ──> ACTIVE
                                                                       │
           CLOSED <── CLOSURE_PENDING <── FROZEN <── DORMANT <── RESTRICTED / SUSPENDED
```

---

## 3. Account Lifecycle
Accounts represent concrete multi-currency holdings tied to a product specification:

```
APPLICATION ──> PENDING_APPROVAL ──> OPENING ──> OPEN
                                                  │
                 CLOSED <── CLOSURE_PENDING <── FROZEN <── DORMANT <── RESTRICTED
```
