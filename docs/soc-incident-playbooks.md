# Security Incident Response Playbooks & Lifecycle

## 1. 8-Stage Incident Response Lifecycle
1. **DETECTION**: Automated rule detection or manual escalation.
2. **TRIAGE**: Triage analyst assesses severity, affected blast radius, and priority (P0 to P3).
3. **INVESTIGATION**: Timeline analysis linking Actor $\rightarrow$ Session $\rightarrow$ Device $\rightarrow$ IP $\rightarrow$ Resources.
4. **CONTAINMENT**: Safe automated/manual actions (Session revocation, API key disabling, Device blacklisting, Account freeze).
5. **ERADICATION**: Removal of malicious artifacts, credential revocation, patch deployment.
6. **RECOVERY**: Controlled service restoration with enhanced monitoring.
7. **POST-INCIDENT REVIEW (PIR)**: Root cause analysis, timeline documentation, control improvements.
8. **CLOSED**: Formal executive and compliance sign-off.

---

## 2. Standard Security Incident Playbooks

### Playbook 1: Workforce Credential Compromise
- **Trigger**: Account takeover signals, impossible travel, or credential stuffing hit.
- **Immediate Containment**:
  1. Revoke all active sessions for targeted identity via `POST /api/security/sessions/:id/revoke`.
  2. Suspend active workforce role bindings.
  3. Reset MFA credentials and force passkey re-registration.
- **Investigation**: Review customer records accessed during the suspicious window.

### Playbook 2: Privileged API Key Compromise
- **Trigger**: API key usage outside allowed CIDR block or elevated error spike.
- **Immediate Containment**:
  1. Rotate / disable the API key immediately.
  2. Audit recent payment and wallet transactions initiated via the key.
  3. Place temporary holds on large outgoing settlements pending verification.
