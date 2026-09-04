# Financial Control & Internal Governance Framework

## 1. Dual Authorization (Maker-Checker) Policies
Financial mutations exceeding predefined thresholds require independent approval:
- Manual Journal Entries > NGN 100,000 / XOF 200,000
- Operational Suspense Write-Offs
- Direct Settlement Payout Overrides
- Accounting Period Status Transitions (`CLOSE` / `LOCK` / `REOPEN`)

---

## 2. 360° Forensic Audit Trace
Every ledger line must be traceably linked to its original external banking session:
$$\text{HTTP Request} \longrightarrow \text{Payment Intake} \longrightarrow \text{Attempt \#N} \longrightarrow \text{Provider Node} \longrightarrow \text{Webhook Event} \longrightarrow \text{Subledger Mutation} \longrightarrow \text{GL Journal Line}$$
This ensures zero unbacked balance mutations across the entire financial infrastructure.
