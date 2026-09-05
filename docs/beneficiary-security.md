# Beneficiary Management & Security Engine

## 1. Zero-Trust Counterparty Lifecycle
```
ADDED ──> VERIFICATION_PENDING ──> COOLDOWN_WINDOW (24h) ──> ACTIVE ──> BLOCKED / DEACTIVATED
```

---

## 2. Security Safeguards
1. **Name Matching Verification**: Account name must resolve against Providus NIP Name Inquiry / Coris Sahel Switch before activation.
2. **24-Hour Cooldown Window**: Newly added beneficiaries are restricted to Tier-1 maximums (₦50,000 / 100,000 CFA) during the first 24 hours to prevent Account Takeover (ATO) drain.
3. **Step-Up Biometric / OTP Challenge**: Mandated for beneficiaries with elevated counterparty risk flags.
