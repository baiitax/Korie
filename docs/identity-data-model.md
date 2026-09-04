# Identity Data Model & Schema Topology

## 1. Entity Relational Topology

```
                       ┌─────────────────────────┐
                       │    identity_persons     │
                       └───────────┬─────────────┘
                                   │ 1
        ┌──────────────────────────┼──────────────────────────┐
        │ 1                        │ 1                        │ 1
        ▼ *                        ▼ *                        ▼ *
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│identity_docs  │          │identity_verifs│          │identity_devs  │
└───────────────┘          └───────────────┘          └───────────────┘
                                   ▲
                                   │ *
                                   │ 1
                       ┌───────────┴─────────────┐
                       │ identity_organizations  │
                       └───────────┬─────────────┘
                                   │ 1
                                   │ *
                       ┌───────────▼─────────────┐
                       │identity_beneficial_owners│
                       └─────────────────────────┘
```

---

## 2. Table Specifications

### `identity_persons`
- `id` (UUID PK): Unique canonical identifier.
- `identity_reference` (VARCHAR UNIQUE): e.g. `KID-NG-884210`.
- `first_name` (VARCHAR), `middle_name` (VARCHAR), `last_name` (VARCHAR).
- `date_of_birth` (DATE), `gender` (VARCHAR), `nationality` (VARCHAR).
- `country_code` (VARCHAR(2)): `NG` or `NE`.
- `phone_primary` (VARCHAR), `email_primary` (VARCHAR).
- `kyc_tier` (VARCHAR): `TIER_0`, `TIER_1`, `TIER_2`, `TIER_3`.
- `kyc_status` (VARCHAR): `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `VERIFIED_WITH_LIMITATIONS`, `REJECTED`, `EXPIRED`, `REVERIFICATION_REQUIRED`.
- `identity_status` (VARCHAR): `PENDING`, `ACTIVE`, `RESTRICTED`, `SUSPENDED`, `LOCKED`, `DEACTIVATED`, `CLOSED`, `DUPLICATE`.
- `risk_level` (VARCHAR): `VERY_LOW`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

### `identity_organizations`
- `id` (UUID PK)
- `identity_reference` (VARCHAR UNIQUE): e.g. `KID-ORG-990142`.
- `legal_name` (VARCHAR), `trading_name` (VARCHAR).
- `registration_number` (VARCHAR): CAC RC Number (Nigeria) or RCCM (Niger Republic).
- `tax_identifier` (VARCHAR): TIN / NIF.
- `country_code` (VARCHAR(2)): `NG` or `NE`.
- `business_type` (VARCHAR): `LIMITED_COMPANY`, `SOLE_PROPRIETORSHIP`, `PARTNERSHIP`, `FINTECH`, `AGGREGATOR`.
- `kyb_status` (VARCHAR): `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `CONDITIONAL`, `REJECTED`, `EXPIRED`.
- `status` (VARCHAR): `ACTIVE`, `RESTRICTED`, `SUSPENDED`.
- `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

### `identity_verifications` (Evidence Log)
- `id` (UUID PK)
- `identity_id` (UUID NOT NULL)
- `provider_code` (VARCHAR): e.g. `NIMC_NIN`, `NIBSS_BVN`, `CAC_REGISTRY`, `NIGER_NINA_REGISTRY`, `ONFIDO_BIOMETRIC`.
- `provider_reference` (VARCHAR)
- `verification_type` (VARCHAR): `DOCUMENT`, `NATIONAL_ID`, `BIOMETRIC_LIVENESS`, `BUSINESS_REGISTRY`, `ADDRESS`.
- `confidence_score` (INT CHECK (0..100))
- `status` (VARCHAR): `VERIFIED`, `FAILED`, `PENDING`, `MANUAL_REVIEW`.
- `evidence_sha256_hash` (VARCHAR(64) NOT NULL)
- `verified_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())

### `identity_documents` (Secure Metadata Registry)
- `id` (UUID PK)
- `identity_id` (UUID NOT NULL)
- `document_type` (VARCHAR): `PASSPORT`, `NATIONAL_ID`, `DRIVERS_LICENSE`, `CAC_CERTIFICATE`, `UTILITY_BILL`, `TAX_CLEARANCE`.
- `document_number_masked` (VARCHAR)
- `file_sha256_hash` (VARCHAR(64) NOT NULL)
- `mime_type` (VARCHAR NOT NULL)
- `file_size_bytes` (BIGINT NOT NULL)
- `storage_path_encrypted` (TEXT NOT NULL)
- `verification_status` (VARCHAR): `VERIFIED`, `PENDING`, `REJECTED`, `EXPIRED`.
- `expires_at` (DATE)
- `uploaded_at` (TIMESTAMPTZ)

### `identity_beneficial_owners`
- `id` (UUID PK)
- `organization_id` (UUID REFERENCES identity_organizations(id))
- `person_identity_id` (UUID REFERENCES identity_persons(id))
- `role` (VARCHAR): `DIRECTOR`, `SHAREHOLDER`, `BENEFICIAL_OWNER`, `AUTHORIZED_SIGNATORY`.
- `ownership_percentage` (NUMERIC(5,2) CHECK (ownership_percentage BETWEEN 0 AND 100))
- `is_pep` (BOOLEAN DEFAULT FALSE)
- `verified_status` (VARCHAR): `VERIFIED`, `PENDING`, `REJECTED`.
