# AML Security, Data Privacy & Access Controls

## 1. Access Control Matrix
- `AML_ANALYST`: Triage alerts, view transaction timelines, draft investigation notes.
- `AML_INVESTIGATOR`: Open cases, explore graph intelligence, attach evidence, recommend actions.
- `MLRO / COMPLIANCE_OFFICER`: Final approval on STR filings, account restrictions, and maker-checker sign-offs.
- `AUDITOR`: Read-only signed evidence access with tamper verification.

---

## 2. PII Protection & Data Minimization
- Customer NIN, BVN, phone numbers, and identity documents are masked by default in investigation queues.
- Evidence files use signed, short-lived URLs with strict access audit logging.
