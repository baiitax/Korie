# API Gateway Security, Granular Scopes & Rate Limiting

## 1. Request Security Pipeline

Every inbound API request must sequentially pass through 10 enforcement stages before business execution:

```
[Inbound HTTPS/TLS 1.3]
          │
          ▼
[1. Client Identity & Credential Hash Check] ──▶ (API Key prefix / OAuth JWT verification)
          │
          ▼
[2. IP Whitelist & Geo-Fence Check] ───────────▶ (Enforces country/CIDR bounds)
          │
          ▼
[3. Granular Scope Authorization] ────────────▶ (Verifies required scope e.g., `transfers:write`)
          │
          ▼
[4. Resource Authorization & Anti-IDOR] ───────▶ (Ensures client owns target account/merchant)
          │
          ▼
[5. Multi-Tier Rate Limiting & Throttling] ───▶ (Token bucket per client/endpoint)
          │
          ▼
[6. Idempotency Key Cache Inspection] ─────────▶ (Prevents duplicate financial executions)
          │
          ▼
[7. JSON Schema Validation & PII Redaction] ──▶ (Validates request payload structure)
          │
          ▼
[8. Circuit Breaker & Upstream Health Check] ──▶ (Ensures provider adapter is `CLOSED`)
          │
          ▼
[9. Authoritative Domain Service Execution] ───▶ (Switch / Core Ledger / Account Service)
          │
          ▼
[10. Audit Log & Telemetry Dispatch] ──────────▶ (Logs `request_id`, `correlation_id`, `trace_id`)
```

---

## 2. Granular Scopes Catalog

| Scope Code | Name | Description | Sensitivity Tier |
|---|---|---|---|
| `accounts:read` | Read Accounts | Retrieve customer account metadata and balance snapshots. | CONFIDENTIAL |
| `transfers:write` | Initiate Transfer | Execute interbank or internal P2P funds movement. | HIGH_RISK_FINANCIAL |
| `payments:create` | Create Payment | Generate dynamic collection orders and merchant checkouts. | FINANCIAL |
| `settlements:read`| Settlement Query | Inspect partner clearing and net settlement records. | CONFIDENTIAL |
| `webhooks:manage` | Manage Webhooks | Register, rotate signing secrets, and replay webhook events.| INTERNAL |
| `fx:quote` | FX Rate Quotation| Fetch live firm foreign exchange rates between NGN and XOF. | INTERNAL |

---

## 3. Multi-Tier Rate Limiting Architecture

- **Global Tier**: 50,000 requests/sec across edge WAF.
- **Partner Organization Tier**: Configurable tier-based quotas (e.g., Tier-1 Partner: 2,000 req/s, Standard Partner: 250 req/s).
- **Endpoint-Specific Tier**: Strict bursting caps on financial mutation endpoints (`POST /transfers`: 50 req/s burst limit per client).
