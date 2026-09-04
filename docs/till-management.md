# Till Management, Sessions & Handover Governance

## 1. Formal Till Lifecycle State Machine
Tills represent working cash drawers allocated to tellers, branch cashiers, and authorized agency banking operators:

```
UNASSIGNED
    │
    ▼
ASSIGNED ────────► OPEN ────────► ACTIVE ────────► SUSPENDED
                    │               │                 │
                    │               ▼                 ▼
                    │      HANDOVER_PENDING ◄─────────┘
                    │               │
                    │               ▼
                    └───────────► CLOSED ────────► RECONCILED
```

---

## 2. Daily Till Opening & Closing Protocols
1. **Till Opening**: Operator Authentication $\rightarrow$ Device Trust Check $\rightarrow$ Physical Denomination Count $\rightarrow$ Supervisor Sign-off $\rightarrow$ `ACTIVE`.
2. **Till Handover**:
   - Outgoing Operator inputs physical banknote count.
   - System computes variance against expected balance.
   - Incoming Operator recounts and accepts custody.
   - Both digital signatures and device IDs are bound to the `till_handovers` record.
3. **Till Closing**: Final denomination count $\rightarrow$ End-of-Day cash sweep to Branch Vault $\rightarrow$ Variance review $\rightarrow$ `CLOSED`.
