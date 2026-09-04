# KORIEPAY WEBHOOKS & EVENT-DRIVEN DISPATCH SPECIFICATION

## 1. HMAC-SHA256 Signature Verification
Every webhook dispatched by KoriePay includes an `X-KoriePay-Signature` header:

```http
POST https://your-server.com/webhooks/koriepay
Content-Type: application/json
X-KoriePay-Signature: t=1788430500,v1=98f12a8849b2c0192e48271a0b3f81e62194c278912ba09148b192e817492c10
```

### Verification Algorithm
```javascript
const crypto = require('crypto');

function verifyWebhook(rawPayload, signatureHeader, secretKey) {
  const [tPart, sigPart] = signatureHeader.split(',');
  const timestamp = tPart.split('=')[1];
  const signature = sigPart.split('=')[1];

  const signedPayload = `${timestamp}.${rawPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 2. Retry Policy & Exponential Backoff
- Attempt 1: Immediate dispatch (SLA < 200ms)
- Attempt 2: 5 minutes later
- Attempt 3: 30 minutes later
- Attempt 4: 2 hours later
- Attempt 5: 6 hours later (Final attempt before alert)
