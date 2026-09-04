# Privileged Access Management (PAM) & Break-Glass Protocols

## 1. Just-In-Time (JIT) Elevated Access
KoriePay rejects standing permanent administrative privileges on production and financial infrastructure. Personnel operate with least privilege by default and request time-limited Just-In-Time (JIT) elevation for sensitive operations.

### JIT Workflow Lifecycle:
1. **Request**: Workforce actor submits a structured request specifying:
   - Target Role / Privilege Scope (e.g., `TREASURY_REBALANCE_PROV_NG`, `DATABASE_READ_DIAGNOSTICS`).
   - Business Justification & Incident / Change Reference ID.
   - Requested Duration (default: 30 minutes, max: 120 minutes).
2. **Dual-Authorization**: Requires designated Checker sign-off (MLRO, Security Director, or Infrastructure Lead).
3. **Issuance**: Ephemeral privilege grant issued with cryptographic lease timer.
4. **Active Session Surveillance**: All actions executed under the lease generate high-fidelity security audit trails.
5. **Auto-Revocation**: Upon lease expiry, privileges and active privileged sessions terminate automatically.

---

## 2. Emergency Break-Glass Access Protocol
Break-Glass provides a resilient, strictly governed bypass mechanism for critical outages when standard multi-person authorization paths are unavailable.

```
Break-Glass Request Triggered
       |
       +---> [1] Mandatory Justification & Ticket Reference Input
       +---> [2] Cryptographic Hardware MFA Verification (AAL3)
       +---> [3] High-Severity Security Event (CRITICAL) Generated
       +---> [4] Real-Time Emergency Notification to Security / CISO Channel
       +---> [5] Maximum Time-to-Live (TTL): 30 Minutes
       +---> [6] Mandatory Post-Incident Audit Review & Justification Attestation
```

### Invariants:
- Zero silent break-glass actions.
- Automatic session termination upon TTL expiration.
- Post-incident forensic packet locked for auditor verification.
