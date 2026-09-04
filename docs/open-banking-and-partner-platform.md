# Open Banking Protocols, Partner 360 & KYB Lifecycle

## 1. Open Banking Integration Architecture

KoriePay provides compliant Open Banking interfaces modeled after the Central Bank of Nigeria (CBN) Open Banking Regulatory Framework and international Open Banking standards:

- **Account Information Services (AIS)**: Consent-governed access to customer transaction history and balances.
- **Payment Initiation Services (PIS)**: Secure tokenized payment authorization with customer-directed multi-factor authentication (MFA).

---

## 2. Partner 360 & Governance Lifecycle

```
[1. Application & Registration]
          │
          ▼
[2. KYB & UBO Due Diligence] ──▶ (Corporate Affairs Commission / RC Number check)
          │
          ▼
[3. Compliance & Risk Review] ──▶ (Sanctions / PEP / Adverse media screening)
          │
          ▼
[4. Sandbox Certification] ────▶ (Developer passes 10 mandatory integration test cases)
          │
          ▼
[5. Production Approval] ──────▶ (Maker-checker dual authorization by Compliance & CISO)
          │
          ▼
[6. Active Production SLA] ────▶ (Real-time monitoring of volume, chargebacks & latency)
```

---

## 3. Partner Risk Profiling & Commercial Limits

Every partner organization is assigned an automated risk tier (`LOW`, `MEDIUM`, `HIGH`) determining:
- **Daily Settlement Cap**: e.g., ₦50,000,000 max daily payout without manual treasury signoff.
- **Velocity Thresholds**: Max requests per minute and max concurrent open webhook retry queues.
