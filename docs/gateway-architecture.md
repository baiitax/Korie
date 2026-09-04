# API Gateway & Integration Control Plane Architecture

## 1. Zero-Trust Gateway Perimeter & Domain Separation
KoriePay implements a centralized API Gateway and Integration Control Plane. The Gateway serves as the authoritative, hardened integration perimeter protecting KoriePay's core banking and financial subsystems from direct external exposure.

```
                         INTERNET (Partners, Merchants, Aggregators, Mobile Clients)
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │       KORIEPAY API GATEWAY  │
                                      └─────────────────────────────┘
                                                     │
                      ┌──────────────────────────────┼──────────────────────────────┐
                      ▼                              ▼                              ▼
             [1] Authenticate              [2] Scope & RBAC/ABAC          [3] Multi-Dim Rate Limit
             (OAuth2 / HMAC / mTLS)        (Resource & Country Scope)     (IP / Client / Quota)
                      │                              │                              │
                      └──────────────────────────────┼──────────────────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │   [4] Idempotency & Hash    │
                                      │   (Prevent Duplicate Debits)│
                                      └─────────────────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │ [5] Schema & Content Valid. │
                                      └─────────────────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │  INTEGRATION CONTROL PLANE  │
                                      └─────────────────────────────┘
                                                     │
                      ┌──────────────────────────────┼──────────────────────────────┐
                      ▼                              ▼                              ▼
             [Internal APIs]                [Partner APIs]                 [Provider Adapters]
             (Core Banking / Admin)         (Transfers, KYC, QR)           (Providus NG, Koris NE)
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │      FINANCIAL CORE         │
                                      │  Payment Switch & Ledger    │
                                      │  (Immutable Double-Entry)   │
                                      └─────────────────────────────┘
```

---

## 2. Inviolable Financial Core Invariants
1. **The Gateway is Not the Ledger**: The API Gateway strictly governs traffic, authentication, validation, rate limiting, and telemetry. It owns zero financial balances and never performs unvalidated ledger writes.
2. **Provider Isolation**: Third parties, partners, and external banking nodes never communicate directly with internal databases. All upstream and downstream traffic routes through isolated Provider Adapters.
3. **Traceability Guarantee**: Every API invocation generates a traceable correlation chain:
   $$\text{Client Request} \rightarrow \text{Gateway Request ID} \rightarrow \text{Correlation ID} \rightarrow \text{Switch Attempt} \rightarrow \text{GL Journal Ref} \rightarrow \text{Webhook Dispatch}$$
