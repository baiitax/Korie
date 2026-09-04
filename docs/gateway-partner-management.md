# Partner Management & Partner 360 Governance

## 1. Partner Registry & Categories
KoriePay classifies integration partners into distinct governance profiles:
- `BANK`: Commercial settlement partners (Providus Bank Nigeria, Koris Bank Niger Republic).
- `FINTECH` / `AGGREGATOR`: Payment service providers and multi-tenant platforms.
- `MERCHANT`: Direct corporate merchants utilizing Checkout and Payment APIs.
- `AGENCY_PARTNER`: Super-agents and agency network franchisees.
- `BDC_PARTNER`: Bureau De Change currency conversion operators.
- `KYC_AML_VENDOR`: External verification and watchlists providers.

---

## 2. 12-Stage Partner Lifecycle & Production Gating
$$\text{PROSPECT} \rightarrow \text{APPLICATION} \rightarrow \text{DUE\_DILIGENCE} \rightarrow \text{KYB\_VERIFIED} \rightarrow \text{CONTRACT\_SIGNED} \rightarrow \text{SANDBOX\_PROVISIONED} \rightarrow \text{TECHNICAL\_CERTIFICATION} \rightarrow \text{PILOT} \rightarrow \text{PRODUCTION\_ACTIVE}$$

### Invariants:
- Production API credentials are never provisioned upon self-service registration.
- Transitioning to `PRODUCTION_ACTIVE` requires Maker-Checker dual authorization (Compliance Lead + Infrastructure Lead sign-offs).
