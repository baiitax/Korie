# KORIEPAY DEVELOPER OBSERVABILITY & USAGE ANALYTICS

## 1. Metrics Dimensions
The platform captures end-to-end request telemetry:
- **Throughput**: Requests per second (RPS) and requests per minute (RPM).
- **Latency**: Provider round-trip time (RTT) for Providus Bank NG and Coris Bank NE.
- **Error Distribution**: Grouped by HTTP 4xx client errors and 5xx upstream node errors.
- **Webhook Health**: Delivery success rate, latency distribution, retry counts.

---

## 2. Request Correlation & Tracing
Every request receives a `KP-REQ-` trace identifier and optional `Correlation-ID` preserved across banking switches for sub-second audit reconstruction.
