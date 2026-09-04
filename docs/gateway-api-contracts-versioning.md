# API Versioning, Contracts & Standardized Envelope

## 1. Explicit URI Versioning Policy
All public, partner, and internal APIs follow deterministic version paths:
- Version 1: `/api/v1/payments`, `/api/v1/transfers`, `/api/v1/wallets`, `/api/v1/customers`, `/api/v1/webhooks`.
- Future Versions: `/api/v2/...`

### Deprecation & Sunset Lifecycle:
$$\text{ANNOUNCED} \rightarrow \text{DEPRECATED (180 Days Grace)} \rightarrow \text{MIGRATION SUNSET WARNING} \rightarrow \text{SUNSET RETIRED}$$

---

## 2. Standardized Response & Error Envelopes

### Success Envelope (`HTTP 200 / 201 / 202`):
```json
{
  "success": true,
  "data": {
    "transferId": "TRF-NG-20260904-0012",
    "amount": 500000,
    "currency": "NGN",
    "status": "PROCESSING"
  },
  "meta": {
    "requestId": "KP-REQ-7f9a2b",
    "correlationId": "CORR-99120-ABC",
    "timestamp": "2026-09-04T12:00:00.000Z",
    "apiVersion": "v1"
  }
}
```

### Error Envelope (`HTTP 400 / 401 / 403 / 404 / 409 / 429 / 500 / 503`):
```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Idempotency key reused with different request payload.",
    "details": ["Hash mismatch on 'amount' field."],
    "retryable": false
  },
  "meta": {
    "requestId": "KP-REQ-7f9a2b",
    "correlationId": "CORR-99120-ABC",
    "timestamp": "2026-09-04T12:00:00.000Z",
    "apiVersion": "v1"
  }
}
```
