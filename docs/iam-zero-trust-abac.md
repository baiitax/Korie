# Zero-Trust & Attribute-Based Access Control (ABAC)

## 1. Multi-Dimensional Access Evaluation
KoriePay evaluates zero-trust authorization dynamically on every request. Authorization is never granted simply because `user.isAdmin === true` or by virtue of network location.

Every authorization evaluation computes a composite decision:
$$\text{Decision} = f(\text{Identity}, \text{AAL}, \text{Session}, \text{Device}, \text{Role}, \text{Permission}, \text{Resource}, \text{Action}, \text{Risk}, \text{Jurisdiction}, \text{SoD})$$

```
Request (Actor + Target Resource + Action)
       |
       +---> [1] Identity Lifecycle & Status Check (ACTIVE?)
       +---> [2] Authentication Assurance Level (AAL3 required for High-Risk?)
       +---> [3] Device Posture & Trust (Device Registered, Uncompromised?)
       +---> [4] RBAC Matrix (Does Role hold Resource:Action binding?)
       +---> [5] ABAC Policy (Jurisdiction match, Amount threshold, Branch match?)
       +---> [6] Separation of Duties (Is Maker == Checker?)
       +---> [7] Risk & Anomaly Score (Threat signals < 50?)
       |
       v
Decision: ALLOW | STEP_UP_MFA | REQUIRE_APPROVAL | DENY
```

---

## 2. Resource-Level Authorization & IDOR Prevention
To prevent Insecure Direct Object References (IDOR), object-level queries must evaluate resource tenancy and ownership server-side:

```typescript
// Enforced in server-side authorization layer:
const canAccess = await iamEngine.evaluateAccess({
  actor: currentOfficer,
  resource: { type: 'CUSTOMER_RECORD', id: targetCustomerId, jurisdiction: 'NG', sensitivity: 'CONFIDENTIAL' },
  action: 'READ_PII',
  context: { ip: requestIp, deviceId, aal: sessionAal }
});
if (!canAccess.allowed) {
  throw new ForbiddenError(canAccess.reason);
}
```

---

## 3. Separation of Duties (SoD) Policy Invariants
The platform enforces mathematical Separation of Duties:
- **Finance SoD**: Journal Maker $\neq$ Journal Authorizer.
- **Settlement SoD**: Settlement Batch Creator $\neq$ Settlement Dispatcher.
- **AML SoD**: Lead Alert Investigator $\neq$ Final MLRO Resolution Approver.
- **Security SoD**: IAM Policy Editor $\neq$ Policy Deployment Approver.
- **PAM SoD**: Privilege Requester $\neq$ Privilege Grantor.
