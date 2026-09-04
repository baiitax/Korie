# Idempotency Engine & Multi-Dimensional Rate Limiting

## 1. Idempotency Protocol
Financial mutations require an `Idempotency-Key` header:
- **Key Storage**: `(partner_id, idempotency_key)` mapped to `(request_hash, response_payload, status, transaction_id)`.
- **Match Behavior**:
  - Exact match on Key + Request Hash $\rightarrow$ Returns original cached response without re-executing ledger writes.
  - Key reused with different Request Hash $\rightarrow$ Immediate `HTTP 409 IDEMPOTENCY_CONFLICT`.

---

## 2. Multi-Dimensional Rate Limiting
- **Client Tier**: 100 req/sec (Standard Partner), 500 req/sec (Enterprise Aggregator).
- **Endpoint Specific**: Strict limits on high-impact routes (e.g. `POST /api/v1/transfers` capped at 25 req/sec/client).
- **Financial Value Limits**: Handled by the authoritative `AccountLimitEngine`.
