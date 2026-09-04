# KORIEPAY API RATE LIMITS & CAPACITY GOVERNANCE

## 1. Rate Limiting Architecture
Rate limits are enforced at the Edge API Gateway using token-bucket and sliding-window counters in Redis.

---

## 2. Default Rate Limit Tiers

| Tier / Category | Max RPM | Burst Limit | Daily Quota | HTTP Status |
|---|---|---|---|---|
| **Sandbox Default** | 600 req/min | 900 req/min | 2,500,000 reqs | 429 Too Many Requests |
| **Production Payments**| 2,400 req/min | 3,600 req/min | 10,000,000 reqs | 429 Too Many Requests |
| **FX Corridor Queries** | 1,200 req/min | 1,800 req/min | 5,000,000 reqs | 429 Too Many Requests |
| **KYC / Identity** | 120 req/min | 180 req/min | 50,000 reqs | 429 Too Many Requests |

---

## 3. Rate Limit Headers
```http
X-RateLimit-Limit: 2400
X-RateLimit-Remaining: 2388
X-RateLimit-Reset: 1788430560
Retry-After: 30
```
