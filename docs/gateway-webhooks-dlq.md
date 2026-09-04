# Webhook Delivery Platform, Replay Protection & Dead-Letter Queue (DLQ)

## 1. Outbound Webhook Security & Signatures
Every outbound event dispatched to partner webhook endpoints is cryptographically signed using HMAC-SHA256:
$$\text{Signature} = \text{HMAC-SHA256}(\text{WebhookSecret}, \text{Timestamp} + \text{"."} + \text{RawPayload})$$
- Header: `X-KoriePay-Signature: t=1757000000,v1=7f9a2b8c...`
- Replay Prevention: Payloads older than 5 minutes ($300\text{ seconds}$) are rejected by client SDKs.

---

## 2. Delivery Engine, Backoff & Dead-Letter Queue
- **Retry Policy**: Up to 5 attempts using exponential backoff with jitter ($2\text{s}, 8\text{s}, 32\text{s}, 128\text{s}, 512\text{s}$).
- **Dead-Letter Queue (DLQ)**: Exhausted deliveries transition to DLQ with detailed failure reason codes.
- **Manual Replay**: Authorized administrators can replay failed DLQ events with audit tracking.
