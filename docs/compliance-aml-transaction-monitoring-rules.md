# AML Transaction Monitoring Rules & Typology Library

## Core Automated Surveillance Rules
1. **AML-RULE-101 (High-Velocity Inflow & Instant Cashout / Layering)**:
   - *Condition*: Entity receives cumulative inflow exceeding ₦5,000,000 (or 5,000,000 XOF) and initiates outflow transfers of ≥90% within <15 minutes.
   - *Severity*: CRITICAL
   - *Action*: Temporary settlement hold + AML alert generation + automatic escalation to investigation case.

2. **AML-RULE-102 (Structuring / Smurfing Anomaly)**:
   - *Condition*: Entity conducts ≥4 transactions within 6 hours, each falling between ₦4,800,000 and ₦4,999,999 (just below the statutory NFIU ₦5.0M CTR reporting threshold).
   - *Severity*: HIGH
   - *Action*: Alert triggered + Aggregated CTR report draft queued.

3. **AML-RULE-103 (Cross-Border Velocity Surge)**:
   - *Condition*: Cross-border flow between Nigeria and Niger Republic surges by >400% against the entity's 30-day baseline average.
   - *Severity*: HIGH
   - *Action*: Alert triggered + Source of Funds verification initiated.

4. **AML-RULE-104 (Dormant Account Awakening)**:
   - *Condition*: Account inactive for >180 days suddenly receives high-value transfer >₦10,000,000.
   - *Severity*: CRITICAL
   - *Action*: Immediate Post-No-Debit (PND) + MLRO review requirement.
