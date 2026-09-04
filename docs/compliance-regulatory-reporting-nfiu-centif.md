# Regulatory Reporting Engine: NFIU GoAML & BCEAO CENTIF Workflows

## 1. NFIU Reporting (Nigeria)
- **Cash Transaction Reports (CTR)**: Automatically aggregated on a monthly basis for all cash and digital cashout transactions exceeding ₦5,000,000 for individuals and ₦10,000,000 for corporate entities. XML payload formatted to NFIU GoAML Schema v4.0.
- **Suspicious Transaction Reports (STR)**: Filed through direct secure encrypted gateway within 24 hours of investigation ruling. Includes narrative typology, transaction log hashes, and target KYC data.

## 2. CENTIF Reporting (Niger Republic / BCEAO)
- **Déclarations de Soupçon (STR/CFT)**: Formatted per BCEAO UMOA Uniform AML Guidelines. Transmitted directly to CENTIF Niamey operational desk.
- **Rapports Périodiques de Risque**: Quarterly risk returns reporting total transaction volume, foreign exchange settlement flows, and cross-border corridor aggregations.

## Regulatory Acknowledgement Tracking
All submitted filings store immutable cryptographic acknowledgement tokens (e.g. `ACK-NFIU-STR-2026-08492`) linked to the corresponding case file.
