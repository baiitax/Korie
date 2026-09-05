# Enterprise Adashi / Rotating Savings & Credit Association (ROSCA) Architecture

## 1. Executive Summary & Architectural Overview

The **KoriePay Adashi / Ajo / ROSCA Platform** is an enterprise-grade rotating savings orchestration engine designed for Nigeria (NGN, Providus Bank rail, Central Bank of Nigeria regulations) and Niger Republic (XOF, Coris Bank rail, BCEAO regulations).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ADASHI PRODUCT & ORCHESTRATION LAYER                    │
│   Group Lifecycle • Membership Lock • Cryptographic Allocation • Cycle Scheduling      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Governed Financial Execution
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHORITATIVE OPERATIONAL SYSTEMS OF RECORD                     │
│  Customer Identity • KYC/KYB • Account Authorization • Payment Switch • Core Ledger    │
│  Settlement Engine • Reconciliation • Fraud & AML Monitoring • Treasury & Group GRC    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Non-Negotiable Financial Principles

1. **Adashi is an Orchestration Engine, Never Financial Truth**:
   - The Adashi module manages operational concepts (membership, cycle timelines, rotation sequences, obligation records). All monetary debits, credits, platform fees, agent commissions, and payouts must execute exclusively through the **Payment Switch** and record immutable double-entry journal postings in the **Core Ledger**.
2. **Deterministic Cryptographic Rotation Allocation**:
   - Beneficiary rotation sequences are generated using SHA-256 HMAC cryptographic commitments over verified member IDs and an immutable block/system seed. `Math.random()` is strictly prohibited. Once published, rotation sequences cannot be edited except through formal maker-checker change requests.
3. **Membership Immutability Upon Lock**:
   - Once an Adashi group achieves its required quorum and is transitioned to `MEMBERSHIP_LOCKED`, member lists are frozen. No silent member additions, removals, or position swaps are permitted.
4. **Idempotency & Unknown Transaction Protection**:
   - All contribution collections and beneficiary payouts enforce durable `Idempotency-Key` headers. Provider timeouts (HTTP 504) result in status `UNKNOWN / PROVIDER_PENDING` with automated reconciliation queries; duplicate debit retries are forbidden while an execution state is in doubt.
5. **Multi-Currency & Multi-Jurisdictional Isolation**:
   - Adashi groups operate either in **NGN** or **XOF**. Cross-currency pools are forbidden without an explicit, versioned FX conversion quote.
