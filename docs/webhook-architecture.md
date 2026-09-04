# KORIEPAY WEBHOOK GATEWAY & RETRY ARCHITECTURE

## 1. Webhook Lifecycle Flow

```
                      External Provider / Bank
                                  │
                                  ▼
                   +──────────────────────────────+
                   |       WEBHOOK GATEWAY        |
                   +──────────────────────────────+
                                  │
                                  ▼
                   +──────────────────────────────+
                   |  HMAC-SHA256 VERIFICATION    |
                   |   (Constant-Time Matching)   |
                   +──────────────────────────────+
                                  │
                                  ▼
                   +──────────────────────────────+
                   |    IDEMPOTENCY DEDUPLICATION |
                   +──────────────────────────────+
                                  │
                                  ▼
                   +──────────────────────────────+
                   |  ATOMIC STATE UPDATE & LEDGER|
                   +──────────────────────────────+
                                  │
                                  ▼
                   +──────────────────────────────+
                   |      OUTBOX DOMAIN EVENT     |
                   +──────────────────────────────+
```

---

## 2. Cryptographic Signature Rules
Every webhook transmitted by KoriePay contains an `X-KoriePay-Signature` header computed as:
$$S = \text{HMAC-SHA256}(\text{timestamp} + "." + \text{raw\_payload}, \text{secret\_key})$$

Tolerance threshold is set to **300 seconds** to mitigate replay attacks.
