# IAM & Security Incident Operational Runbooks

## 1. Daily Operational Security Checklist
1. Review Critical/High Security Alert Queue (`GET /api/security/alerts`).
2. Verify all active JIT privileged sessions have documented business justifications.
3. Audit any Break-Glass events within the past 24 hours.
4. Review anomalous mass customer lookup attempts ($>100\text{ lookups/hr}$).
5. Verify MFA enforcement rate ($\ge 100\%$ on workforce identities).

---

## 2. Emergency Account Lockout & Containment Runbook
When an identity is deemed compromised:
1. Trigger Emergency Lockout via Security Command Center.
2. The IAM Engine automatically executes:
   - Revokes active access tokens and sessions in `iam_sessions`.
   - Sets identity lifecycle state to `LOCKED`.
   - Revokes active JIT privilege leases.
   - Disables registered API keys.
   - Logs `IDENTITY_EMERGENCY_CONTAINMENT_EXECUTED` to `security_events`.
3. Inform Incident Commander and open a formal Security Incident.
