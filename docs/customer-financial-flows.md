# KORIEPAY CUSTOMER BANKING PORTAL — FINANCIAL FLOWS & CORRIDORS

## 1. 5-Step Production Transfer Workflow

```
Step 1: Rail Selection
  ├── 🇳🇬 Nigerian Bank (NIP Gateway via Providus Bank Node)
  ├── 🇳🇪 Niger Bank (WAEMU / GIM-UEMOA via Koris Bank Node)
  └── 🌍 Cross-Border Bilateral Corridor (Sub-second NGN ⇄ XOF conversion)

Step 2: Recipient Account Verification
  ├── Real-time Bank Name Inquiry (10-digit validation)
  └── 1-Tap Saved Beneficiary Fill

Step 3: Amount, Currency & Corridor Conversion
  ├── Live FX rate calculation (1 NGN = 0.408 XOF)
  ├── Transparent fee disclosure (₦50 local / ₦1,250 bilateral)
  └── Daily tier limit check

Step 4: Review & Two-Party Confirmation
  └── Breakdown of gross amount, fee, and net recipient credit

Step 5: PIN Authentication & Gateway Dispatch
  ├── 4-Digit Security PIN or Biometric FaceID Challenge
  ├── Cryptographic idempotency key dispatch
  └── Official shareable digital receipt generation
```

## 2. Electricity DisCo Prepaid Token Vending
- Instant meter number validation (AEDC, EKEDC, IKEDC, KEDCO, IBEDC, NIGELEC Niger).
- Sub-second 20-digit prepaid electricity token vending.
- Direct inclusion in transaction timeline and digital receipt.
