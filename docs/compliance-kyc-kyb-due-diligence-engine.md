# KYC and KYB Due Diligence Engine & Tiering Matrix

## Customer KYC Verification Tiers
| KYC Tier | Identity Requirements | Daily Inflow Cap | Max Cumulative Balance | Verification Engine |
|---|---|---|---|---|
| **Tier 1 (Basic)** | Verified Phone Number, Full Legal Name, Basic Address | ₦50,000 / 50,000 XOF | ₦300,000 / 300,000 XOF | Automated SMS OTP & Telco Match |
| **Tier 2 (Standard)** | NIN / National ID, Biometric Liveness, Verified DOB | ₦200,000 / 200,000 XOF | ₦1,000,000 / 1,000,000 XOF | NIMC / BCEAO ID Gateway Match |
| **Tier 3 (Full)** | BVN/NIN, Proof of Address (Utility <3mo), Source of Funds | ₦5,000,000+ / Unlimited | Unlimited | Address Inspection + Manual MLRO Clearance |

## Merchant KYB & Corporate Due Diligence
- **Registry Validation**: Direct API verification against Corporate Affairs Commission (CAC) in Nigeria and RCCM in Niger Republic.
- **Tax Clearance**: Verification of Federal Inland Revenue Service (FIRS) TIN or Direction Générale des Impôts (DGI) NIF.
- **Ultimate Beneficial Ownership (UBO)**: Mandatory unmasking and screening of any natural person holding ≥5% direct or indirect equity.
- **Director PEP & Sanctions Screening**: Automated screening of all board members and executive directors against OFAC, UN, and CENTIF lists.
