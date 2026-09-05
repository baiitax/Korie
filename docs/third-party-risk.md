# Third-Party Risk Management (TPRM) & Vendor Criticality

## 1. Vendor Criticality Tiering
All commercial partners, correspondent banks, and cloud infrastructure vendors are cataloged:
- **Tier 1 (Mission-Critical Providers)**: Providus Bank Nigeria, Coris Bank Niger, Interswitch Switch, AWS/GCP Cloud, G4S Armored Transport.
- **Tier 2 (High-Impact Operational Partners)**: Smile Identity (KYC/Biometrics), Chainalysis (Blockchain/AML), Infobip (SMS/OTP Gateway).
- **Tier 3 (Standard Business Suppliers)**: Office hardware vendors, administrative SaaS tooling.

---

## 2. Contingency & Failover Mandates
Every Tier 1 Mission-Critical vendor must maintain:
1. Automated active-passive failover mechanisms.
2. Verified Maximum Tolerable Downtime (MTD) $< 30\text{ minutes}$.
3. Formal vendor contract exit and migration runbooks.
