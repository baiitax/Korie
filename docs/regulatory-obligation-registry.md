# Regulatory Obligation Registry & Multi-Jurisdiction Calendar

## 1. Multi-Jurisdictional Scope

KoriePay operates under direct regulatory oversight across West Africa:

### Nigeria (NG)
- **Central Bank of Nigeria (CBN)**: Monthly Financial Returns, Mobile Money Operator (MMO) Transaction Statistics, Payment Service Bank (PSB) Prudential Filings.
- **Nigeria Financial Intelligence Unit (NFIU)**: Suspicious Transaction Reports (STR), Currency Transaction Reports (CTR).
- **Nigeria Deposit Insurance Corporation (NDIC)**: Quarterly Insured Deposit Ledger Returns.

### Niger Republic (NE)
- **Banque Centrale des États de l'Afrique de l'Ouest (BCEAO)**: Monthly Electronic Money Issuer (Émetteur de Monnaie Électronique - EME) Returns, Cross-Border Settlement Reports.
- **Cellule Nationale de Traitement des Informations Financières (CENTIF)**: Anti-Money Laundering & CFT Filings.

---

## 2. Configurable Obligation Registry

Regulatory requirements are never hardcoded in application logic. They are maintained in the `regulatory_obligations` registry with configurable metadata:

| Obligation Code | Regulator | Jurisdiction | Report Title | Frequency | Due Schedule | Owner | Approver |
|---|---|---|---|---|---|---|---|
| `OBL-CBN-FIN-01` | CBN | NG | Monthly Financial & Prudential Return | MONTHLY | 10th of following month | Financial Controller | CFO |
| `OBL-CBN-TX-02` | CBN | NG | MMO Switching & Settlement Volumes | MONTHLY | 10th of following month | Head of Switching | VP Operations |
| `OBL-NFIU-STR-01` | NFIU | NG | Suspicious Transaction Reports (STR) | AD_HOC | Within 24h of confirmation | CCO | Chief Executive |
| `OBL-NDIC-DEP-01` | NDIC | NG | Quarterly Deposit Liability Breakdown | QUARTERLY | 15 days post-quarter end | Financial Controller | CFO |
| `OBL-BCEAO-EME-01`| BCEAO | NE | État Périodique des Émetteurs de Monnaie | MONTHLY | 15th of following month | Finance Lead (Niger) | Country MD (Niger) |
| `OBL-CENTIF-AML-01`| CENTIF | NE | Déclaration d'Opérations Suspectes (DOS) | AD_HOC | Within 48h of confirmation | Compliance Lead (Niger)| CCO |

---

## 3. Reporting Deadlines & Dynamic Alert Engine

The Deadline Engine continuously monitors calendar due dates against report preparation states:

- **`UPCOMING`**: > 5 days prior to statutory deadline.
- **`DUE_SOON`**: $\le 5$ days prior to statutory deadline.
- **`DUE_TODAY`**: Due within current 24-hour cycle.
- **`OVERDUE`**: Past statutory filing deadline without confirmed submission.
- **`SUBMITTED`**: Dispatch confirmed by gateway adapter.
- **`ACKNOWLEDGED`**: Formal regulatory receipt token and timestamp recorded.
