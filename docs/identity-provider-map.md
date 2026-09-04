# Identity Verification Provider Map & Adapter Framework

## 1. Provider Adapter Architecture
The identity platform utilizes an extensible adapter interface `IdentityVerificationProvider` to prevent vendor lock-in and enable seamless failover.

```typescript
export interface IdentityVerificationProvider {
  providerCode: string;
  countryCode: 'NG' | 'NE' | 'CROSS_BORDER';
  isHealthy(): Promise<boolean>;
  verifyNationalId(idNumber: string, dateOfBirth: string): Promise<VerificationResult>;
  verifyBiometricLiveness(selfieBase64: string, idPhotoBase64?: string): Promise<VerificationResult>;
  verifyBusinessRegistry(registrationNumber: string, companyName: string): Promise<BusinessVerificationResult>;
}
```

---

## 2. Integrated Provider Matrix

| Country | Verification Type | Primary Provider / Gateway | Fallback Gateway | Registry Node |
|---|---|---|---|---|
| **Nigeria 🇳🇬** | National Identity (NIN) | NIMC Direct Verification Gateway | SmileID / VerifiedAfrica | NIMC National Database |
| **Nigeria 🇳🇬** | Bank Verification Number (BVN) | NIBSS Direct Identity Switch | Providus Bank KYC Node | NIBSS Central Clearing |
| **Nigeria 🇳🇬** | Business Registration (KYB) | CAC Corporate Affairs Commission Portal | Youverify Business Node | CAC Corporate Registry |
| **Niger Republic 🇳🇪** | National Identity (NINA) | Niger Ministry of Interior Identity Node | Koris Bank KYC Gateway | NINA Central Register |
| **Niger Republic 🇳🇪** | Business Registration (KYB) | RCCM (Registre du Commerce et du Crédit Mobilier) | Sahel Corporate Database | Niamey Commercial Court Registry |
| **Global** | Biometric Liveness & Anti-Spoofing | Onfido / SmileID Biometric SDK | Internal Face-Match Engine | Passive Liveness ISO 30107-3 |

---

## 3. Provider Failover & Degraded Mode
- If a primary national registry times out ($> 8000\text{ms}$), the circuit breaker trips to `HALF_OPEN` and routes requests to the certified secondary adapter.
- If all external providers are offline, the verification status enters `PENDING_MANUAL_REVIEW`. **No user is ever marked `VERIFIED` without cryptographic proof.**
