# Security Audit, Regulatory Compliance & Cross-Domain Integrity

## 1. Regulatory Governance Alignment
KoriePay Enterprise IAM & SOC adheres to strict sovereign and international standards:
- **Central Bank of Nigeria (CBN)**: Risk-Based Cybersecurity Framework for Payment Service Providers.
- **Banque Centrale des États de l'Afrique de l'Ouest (BCEAO)**: UEMOA Directives on Financial Sector Cybersecurity & Dual Authorization.
- **NDPR / Data Privacy**: Access to PII governed by explicit purpose logging, masked fields, and export authorizations.
- **PCI-DSS v4.0**: Requirement 7 (Least Privilege), Requirement 8 (MFA & Authentication), Requirement 10 (Audit Trails).

---

## 2. Cross-Domain Integrity Matrix
IAM and SOC telemetry correlates across all KoriePay domains:
- **IAM $\leftrightarrow$ General Ledger**: Prevents unauthorized manual journal entries; enforces Maker-Checker separation on financial adjustments.
- **IAM $\leftrightarrow$ Payment Switch**: Enforces AAL3 on switch route updates and merchant fee alterations.
- **IAM $\leftrightarrow$ AML**: Preserves investigator audit logs while preventing unauthorized case expungement.
- **IAM $\leftrightarrow$ Treasury**: Protects settlement bank accounts and multi-currency liquidity transfers.
