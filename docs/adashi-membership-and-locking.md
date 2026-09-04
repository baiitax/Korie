# Adashi Membership Lifecycle, Eligibility & Immutable Locking

## 1. Membership Acquisition & Explicit Consent

Customers join Adashi groups strictly through explicit invitation and recorded consent:
1. **Invitation Generation**: Agents issue unique invite links, QR codes, or phone-directed invitations (`INV-2026-ADA-8891`).
2. **Explicit Consent Capture**: The customer reviews product terms, recurring auto-debit authorizations, fee structures, and rotation rules before signing with biometric/PIN verification.
3. **Immutable Consent Vault**: Timestamp, IP address, device fingerprint, product version, and user ID are recorded in `adashi_consents`.

---

## 2. Automated Eligibility Verification Pipeline

Before a customer can be accepted into an active Adashi group:

```
[Customer Consent Received]
             │
             ▼
[1. Account Status Check] ───────▶ (Ensures active Tier-2/3 customer wallet)
             │
             ▼
[2. KYC & Jurisdiction Match] ───▶ (Verifies national ID and currency match)
             │
             ▼
[3. AML & Sanctions Screen] ─────▶ (Zero active AML blocks or STR holds)
             │
             ▼
[4. Existing Obligation Check] ──▶ (Assesses aggregate monthly contribution affordability)
             │
             ▼
[5. Fraud Device Check] ─────────▶ (Flags multiple members sharing identical hardware IMEI)
             │
             ▼
[Membership Approved (`ACCEPTED`)]
```

---

## 3. Membership Lock Protocol

When the group meets its required quorum:
- **Lock Validation**: Confirms all members have status `ACCEPTED`, zero duplicate accounts, and zero unresolved risk holds.
- **State Transition**: Transitions to `MEMBERSHIP_LOCKED`.
- **Immutability Enforcement**: The member list cannot be edited directly; member replacements require formal maker-checker authorization.
