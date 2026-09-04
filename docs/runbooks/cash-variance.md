# Operational Runbook: Cash Variance Investigation & Resolution

## 1. Trigger Condition
A till or vault cash count produces a non-zero variance:
$$\text{Variance} = \text{Counted Cash} - \text{Expected Cash} \neq 0$$

---

## 2. Step-by-Step Resolution Workflow
1. **Immediate Lockdown**: The affected till session is transitioned to `SUSPENDED` to prevent further transactions.
2. **Independent Recount**: A second authorized teller/supervisor performs a recount with physical denomination tallies.
3. **Transaction Audit**: Review all cash-in, cash-out, vault transfers, and reversing transactions executed during the session.
4. **Root-Cause Classification**:
   - `COUNT_ENTRY_TYPO`: Typo corrected with dual sign-off.
   - `FAILED_DISPENSE_NOT_REVERSED`: Transaction recovery engine triggered.
   - `UNRESOLVED_SHORTAGE`: Compensating adjustment posted to `7400 Cash Variance Suspense` with Maker-Checker approval.
   - `SUSPECTED_THEFT`: Escalated to Internal Audit and Corporate Security.
