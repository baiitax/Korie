# Adashi Fraud Prevention, AML Monitoring & Risk Engine

## 1. AML Risk Thresholds & Velocity Monitoring

Adashi structures represent potential vectors for structured money laundering (smurfing) or synthetic circle schemes. The Compliance Engine enforces:
- **Max Active Adashis per Customer**: Tier 1 KYC (Max 2 groups), Tier 2 KYC (Max 5 groups), Tier 3 KYC (Max 12 groups).
- **Group Volume Limits**: Adashi group total expected volume exceeding $5,000,000\text{ NGN}$ or $5,000,000\text{ XOF}$ requires Enhanced Due Diligence (EDD) sign-off.
- **Rapid Cycle Velocity**: Multiple high-value cycles completed within uncharacteristically short windows trigger suspicious activity review (SAR).

---

## 2. Syndicate & Collusion Detection

The Risk Engine calculates graph-clustering metrics on member groups:
- **Identity Overlap Index**: Flags groups where $>40\%$ of members share IP addresses, device fingerprints, next-of-kin, or employer references.
- **Agent Self-Dealing**: Blocks agents from being beneficiaries in Adashi groups they administer unless explicitly authorized under certified cooperative rules.
- **Ghost Member Detection**: Verifies that every group member has completed biometric/BVN/NIN/ID validation before membership lock is certified.
