# Integration Change Management, Versioning & Partner SLAs

## 1. Versioning & Deprecation Policy

KoriePay strictly adheres to semantic API contract governance:
- **Zero In-Place Breaking Changes**: Modification of existing fields or error contracts requires a major version increment (`/api/v1` $\rightarrow$ `/api/v2`).
- **180-Day Sunset Notice**: When an older API version is marked `DEPRECATED`, partners receive automated notifications and a 6-month migration window before sunset.

---

## 2. Partner Service Level Agreements (SLAs)

| Service Metric | SLA Target | Warning Level | Breach Threshold |
|---|---|---|---|
| **Core API Gateway Availability** | $\ge 99.95\%$ | $< 99.90\%$ | $< 99.80\%$ |
| **P95 Transaction Response Latency** | $\le 250\text{ms}$ | $> 500\text{ms}$ | $> 1,200\text{ms}$ |
| **Webhook Delivery P99 SLA** | $\le 2.0\text{s}$ | $> 5.0\text{s}$ | $> 15.0\text{s}$ |
| **Critical Incident MTTR** | $\le 30\text{ mins}$ | $> 45\text{ mins}$ | $> 60\text{ mins}$ |
