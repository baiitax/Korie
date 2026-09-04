# Adashi Defaults, Grace Periods, Penalties & Recovery Lifecycle

## 1. Default Classification & Transition Rules

```
[CONTRIBUTION_DUE]
       │
       ▼ (Payment Fails)
[GRACE_PERIOD_ACTIVE] ────▶ (Default: 24 to 72 hours; SMS/Push Alert sent)
       │
       ▼ (Grace Expiry without payment)
[OVERDUE] ───────────────▶ (Late penalty assessment; credit score penalty)
       │
       ▼ (7 days overdue or cycle closed)
[DEFAULTED] ─────────────▶ (Recovery case initiated; member blacklisted)
```

---

## 2. Recovery & Guarantee Waterfall

When a member defaults after already receiving their lump-sum payout in an earlier cycle:
1. **Agent Guarantee**: If the Adashi was created under Agent Liability terms, agent commission reserves are deducted to restore pool liquidity.
2. **KoriePay Risk Reserve**: Platform reserve fund absorbs shortfall to ensure current cycle beneficiary is disbursed without interruption.
3. **Recovery Case Pipeline**: Legal, collection agency, and direct account freeze/offset actions are tracked in `adashi_recovery_cases`.
4. **Auto-Recovery Offset**: Any incoming deposit to the defaulted customer's KoriePay wallet triggers automated lien debit against outstanding default obligations.
