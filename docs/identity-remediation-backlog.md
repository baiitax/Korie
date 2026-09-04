# Identity Remediation Backlog

## Remediation Roadmap

- **IDN-01 (P0 - Implemented)**: Build `MasterIdentityEngine.ts` with canonical `KID-XXXXXXXX` references unifying Persons and Organizations.
- **IDN-02 (P0 - Implemented)**: Implement `VerificationProviderFramework.ts` with Nigeria (NIMC NIN, BVN, CAC) and Niger Republic (NINA, RCCM) adapters and SHA-256 evidence hashing.
- **IDN-03 (P1 - Implemented)**: Build `DocumentVaultEngine.ts` with secure MIME validation, cryptographic hashing, and access-controlled storage metadata.
- **IDN-04 (P1 - Implemented)**: Implement `BeneficialOwnershipEngine.ts` supporting complex director and shareholder hierarchies ($>25\%$).
- **IDN-05 (P2 - Implemented)**: Create REST API endpoints under `/api/core/v1/identity/` for persons, organizations, verification, documents, and controlled deduplication merge.
- **IDN-06 (P2 - Implemented)**: Upgrade `/admin/kyc` into a comprehensive Master Identity & Verification Desk.
