# Enterprise Integration Fabric, API Gateway & Open Banking Architecture

## 1. Executive Summary & Architectural Overview

The **KoriePay Enterprise Integration Fabric & API Gateway** acts as the governed connectivity and policy perimeter across Nigeria (Providus Bank node) and Niger Republic (Koris Bank node).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL CONNECTIVITY & PARTNER ECOSYSTEM                       │
│  Fintech Partners • Open Banking Apps • Merchants • Agents • Regulators • CIT Couriers │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ TLS 1.3 / mTLS / WAF / Anti-DDoS
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 API GATEWAY PERIMETER                                  │
│  OAuth 2.x • API Key Hashes • Scope Validation • Rate Limiting • Idempotency Engine    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Policy-Enforced Forwarding
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             ENTERPRISE INTEGRATION FABRIC                              │
│  Provider Adapters (Providus/Koris) • Event Outbox & Bus • HMAC Webhook Dispatcher     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Authoritative Domain Invocation
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHORITATIVE OPERATIONAL & CONTROL PLANES                      │
│  Double-Entry Ledger • Payment Switch • Core Banking • AML • Fraud • Treasury • GRC    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Non-Negotiable Integration Principles

1. **Gateway is a Policy Boundary, Not Financial Truth**:
   - The Gateway coordinates authentication, rate limiting, and routing. It never owns customer balances, accounting journals, AML cases, or payment settlement clearing.
2. **Deterministic Financial Traceability**:
   - Every financial API mutation requires an `Idempotency-Key` and emits:
     $$\text{Client Request} \rightarrow \text{API Gateway} \rightarrow \text{Switch / Adapter} \rightarrow \text{Ledger Journal} \rightarrow \text{Settlement} \rightarrow \text{Reconciliation}$$
3. **Multi-Jurisdiction Isolation**:
   - Requests targeting Nigerian rails (`NGN`, CBN regulatory boundary) are strictly isolated from Niger Republic rails (`XOF`, BCEAO regulatory boundary). No cross-currency mutation occurs without explicit FX engine quotation.
4. **Zero-Trust Service-to-Service Security**:
   - Internal service-to-service communication is mutually authenticated via short-lived scoped tokens and mTLS; internal networks are never assumed to be trusted.
