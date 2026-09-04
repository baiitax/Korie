# Immutable Compliance Audit Trail & SHA-256 Vault Specifications

## Ledger Audit Entry Schema
Every action taken within the compliance portal generates an immutable audit record containing:
- `id`: Globally unique monotonic identifier.
- `timestamp`: UTC ISO 8601 millisecond-precision timestamp.
- `officerId` & `officerName`: Authenticated operator details.
- `officerRole`: Operational RBAC clearance tier.
- `action`: Canonical action enumeration (e.g. `KYC_STATUS_UPDATED`, `ACCOUNT_RESTRICTION_APPROVED`).
- `entityType` & `entityId`: Subject of the compliance action.
- `details`: Plaintext audit justification narrative.
- `hash`: SHA-256 HMAC digest chaining the current entry to the preceding audit log hash.

## Cryptographic Evidence Vault
Exhibits, statements, and passports uploaded to cases are hashed with SHA-256 upon ingestion and archived in write-once-read-many (WORM) storage, ensuring legal evidentiary admissibility in judicial and regulatory proceedings.
