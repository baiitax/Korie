# Agent Management Platform Architecture & Lifecycle Model

## 1. Authoritative Agent Lifecycle State Machine
Every agent within KoriePay progresses through a strictly controlled, auditable, and server-authorized lifecycle:

```
┌───────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│  PROSPECT │ ──> │ APPLICATION │ ──> │ KYC_PENDING │ ──> │ APPROVED │
└───────────┘     └─────────────┘     └─────────────┘     └────┬─────┘
                                                               │
┌───────────┐     ┌─────────────┐     ┌─────────────┐          │
│   ACTIVE  │ <── │   TRAINED   │ <── │   TRAINING  │ <────────┘
└─────┬─────┘     └─────────────┘     └─────────────┘
      │
      ├──> RESTRICTED (Velocity breach, minor geo-anomaly)
      ├──> SUSPENDED (Fraud flag, compliance audit failure, dispute surge)
      ├──> UNDER_REVIEW (Maker-checker investigation)
      └──> TERMINATED (Irreversible formal exit)
```

---

## 2. Agent 360 Profile Dimensions
1. **Identity & KYC**:
   - Master Identity Record (`KID-NG-XXXXXX` / `KID-NE-XXXXXX`)
   - Authorized national identity token (NIMC NIN, BVN, NINA, Passport)
   - Verified physical trading address with geo-coordinates
2. **Organizational Hierarchy**:
   - Country (`NG` | `NE`) $\longrightarrow$ State/Region $\longrightarrow$ Branch $\longrightarrow$ Aggregator $\longrightarrow$ Agent $\longrightarrow$ Terminal $\longrightarrow$ Device
3. **Financial & Float Control**:
   - Zero shadow balances; agent float connects strictly to Subledger `2010 (Customer/Agent Stored Value)` in the General Ledger.
   - Configurable tiered transaction velocity limits and cash holding ceilings.
4. **Agent Quality Score (AQS)**:
   - Evaluated on a 0–100 scale computed from 24h transaction success rate, complaint velocity, dispute ratio, and terminal uptime.
