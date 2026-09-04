# Cryptographic Rotation Allocation & Beneficiary Fairness

## 1. Cryptographic Deterministic Beneficiary Allocation

To eliminate allegations of favoritism or agent manipulation, rotation positions are assigned using a cryptographically verifiable allocation algorithm:

$$\text{Member Hash} = \text{HMAC\_SHA256}(\text{System Seed} + \text{Adashi ID}, \text{Member ID})$$

```typescript
// Allocation Execution Algorithm
const combinedSeed = `${adashiId}:${productVersion}:${systemCommitmentBlock}`;
const rankedMembers = members
  .map(m => ({
    memberId: m.id,
    hash: createHmac('sha256', combinedSeed).update(m.id).digest('hex')
  }))
  .sort((a, b) => a.hash.localeCompare(b.hash));

// Ranked slots 1..N assigned to cycles 1..N
```

---

## 2. Fairness Auditing & Anti-Collusion

The Fairness Engine evaluates historical position distribution across all Adashi groups:
- **Early-Position Concentration**: Flags customers who repeatedly secure cycle 1 or 2 slots across multiple concurrent Adashis.
- **Agent Affinity**: Flags high correlation between early beneficiary slots and agent-linked accounts.
- **Fairness Review Flag**: If anomalous concentration exceeds $2.5\sigma$, the allocation is tagged `FAIRNESS_REVIEW_REQUIRED` for Compliance sign-off before publication.

---

## 3. Rotation Immutability & Change Governance

Once transitioned to `ALLOCATION_PUBLISHED`, rotation sequences are permanently locked. If a member exits or defaults:
- Agent submits `ROTATION_CHANGE_REQUEST`.
- Requires written justification, member impact analysis, and **Dual-Authorization** (Maker-Checker by Adashi Supervisor / Compliance Officer).
- Previous rotation version is preserved as `v1_SUPERSEDED`; new version published as `v2_AMENDED`.
