# API Gateway & Integration Data Model Specification

## 1. Relational Schema Tables
- `api_clients`: Registered developer applications, partner IDs, client IDs, and allowed scopes.
- `api_credentials`: Encrypted/hashed API keys, signing secrets, status (`ACTIVE`, `ROTATION_PENDING`, `REVOKED`), and expiration.
- `api_idempotency_records`: Idempotency keys, request SHA-256 hashes, cached response envelopes, and execution timestamps.
- `api_rate_limit_policies`: Tiered rate limiting and quota configurations.
- `partner_registry`: Partner profiles, KYB status, country, legal entity, and operational state.
- `provider_registry`: Banking nodes and payment processors, capabilities, and health states.
- `webhook_subscriptions`: Partner endpoint URLs, subscribed event topics, and signing secrets.
- `webhook_delivery_attempts`: Delivery history, HTTP status codes, latency, retry counts, and DLQ flags.
