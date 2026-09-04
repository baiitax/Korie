# Sanctions & PEP Screening Matrix

## Global Watchlist Ingestion Feeds
The KoriePay Watchlist Screening Engine ingests daily delta updates from:
1. **United Nations Security Council Consolidated Sanctions List (UNSC)**.
2. **US Office of Foreign Assets Control (OFAC SDN & Consolidated List)**.
3. **European Union Consolidated Financial Sanctions List (EU)**.
4. **Central Bank of Nigeria / NFIU Domestic Terrorism & Financial Crime List**.
5. **CENTIF Niger / BCEAO Regional Sanctions Registry**.

## Fuzzy Matching & Scoring Parameters
- **Algorithms**: Levenshtein Distance, Jaro-Winkler Metric, and Double Metaphone phonetic matching.
- **Scoring Thresholds**:
  - `95% - 100%`: Exact Match -> Automated transaction hold & critical alert.
  - `75% - 94%`: High Probability Match -> Placed in Watchlist Review Work Queue.
  - `<75%`: Low Probability / False Positive -> Logged in audit registry.

## PEP Classification Matrix
- **Tier 1 (High Risk)**: Heads of State, Ministers, Governors, Central Bank Executives, Military Chiefs.
- **Tier 2 (Medium Risk)**: Senior Directors, State Commissioners, Judges, Ambassadors.
- **Tier 3 (Monitored)**: Close associates, family members, and business partners of Tier 1/2 PEPs.
