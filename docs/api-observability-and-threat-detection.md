# API Observability, Abuse Surveillance & Threat Detection

## 1. 24/7 API Telemetry & Tracing Headers

Every inbound and outbound request across the Integration Fabric carries non-negotiable correlation identifiers:
- `X-Request-ID`: Unique per-request UUID.
- `X-Correlation-ID`: Cross-service transaction lineage identifier.
- `X-Trace-ID`: Distributed tracing span.

---

## 2. Automated Abuse & Threat Detection

The API Gateway Security Engine monitors for malicious traffic patterns in real time:

1. **Credential Stuffing & Brute Force**: Triggers automated IP bans if $> 5$ failed authentications occur within 60 seconds.
2. **Endpoint Enumeration & IDOR Probing**: Detects sequential ID scraping attempts across `/accounts/` or `/customers/` and issues instantaneous 403 Forbidden responses with SOC alert creation.
3. **Mass Data Scraping**: Rate limits and blocks abnormal burst extraction attempts on read endpoints.
