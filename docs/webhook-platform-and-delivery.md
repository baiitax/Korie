# Webhook Platform, HMAC Signatures & Replay Engine

## 1. Webhook Security & HMAC-SHA256 Signatures

To ensure third-party partner applications can cryptographically verify that inbound webhooks originated authentically from KoriePay:

```
Payload Body: {"event": "payment.succeeded", "amount": 50000, "currency": "NGN"}
Timestamp Nonce: 1725430800

Signature = HMAC_SHA256(SecretKey, Timestamp + "." + PayloadBody)

HTTP Headers Sent to Partner Endpoint:
  X-KoriePay-Signature: t=1725430800,v1=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
  X-KoriePay-Event-ID: evt-89104-pay
  X-KoriePay-Delivery-ID: del-20260904-001
```

---

## 2. Exponential Backoff & Retry Schedule

When a partner endpoint returns a non-2xx status code or times out (> 5,000ms):
- **Attempt 1**: Immediate dispatch ($T_0$).
- **Attempt 2**: $T_0 + 15$ seconds.
- **Attempt 3**: $T_0 + 2$ minutes.
- **Attempt 4**: $T_0 + 15$ minutes.
- **Attempt 5**: $T_0 + 1$ hour.
- **Final Dead-Letter**: Moved to Webhook DLQ with notification sent to partner technical contact.

---

## 3. Webhook Replay Console

Partners and Super Admins can manually trigger individual or batch replays of historical or dead-lettered webhook deliveries directly from the Admin Integration Hub.
