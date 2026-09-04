# KORIEPAY DEVELOPER ECOSYSTEM — ARCHITECTURE & PLATFORM SPECIFICATION

## 1. Executive Summary
The **KoriePay Developer & API Platform** provides a secure, low-latency, multi-tenant engineering gateway enabling approved developers, merchants, aggregators, financial institutions, and internal teams to integrate cross-border financial operations across **Nigeria (NGN)** and **Niger Republic (XOF CFA)**.

---

## 2. Layered Architecture

```
+-------------------------------------------------------------------------+
|                  Developer & Partner Operations Layer                  |
|    Interactive Explorer • Key Vault • Webhooks • Sandbox • Telemetry   |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                       Edge API Gateway & Security                       |
|   Rate Limiter • IP Whitelist • HMAC Signature Verifier • Idempotency   |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                     Core Financial Ledger & Engine                      |
|      Multi-Currency Wallets • Escrow Holds • FX Rate Lock Bridge        |
+-------------------------------------------------------------------------+
                    │                                 │
                    ▼                                 ▼
+---------------------------------------+ +-------------------------------+
|     Providus Bank Nigeria Node        | | Koris Bank Niger Republic Node|
|  NIP Gateway • Virtual NUBANs • Interswitch| | WAEMU GIM-UEMOA • RTGS Clearing |
+---------------------------------------+ +-------------------------------+
```

---

## 3. Core Operational Tenets
1. **Zero Balance Fabrication**: Frontend never alters balances or issues simulated refunds without server authorization.
2. **Double Debit Immunity**: Enforced `Idempotency-Key` headers on all mutating POST endpoints.
3. **Environment Isolation**: Strict cryptographic separation between Sandbox (`kp_test_...`) and Production (`kp_live_...`).
4. **Data Minimization**: Zero display of raw secret keys, OTPs, or customer PANs after initial generation.
