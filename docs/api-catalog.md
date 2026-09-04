# KORIEPAY API CATALOG & ENDPOINT REFERENCE

## 1. API Product Catalog Summary
The platform exposes 8 distinct REST categories:

| Category | Base Path | Description | Supported Corridors |
|---|---|---|---|
| **Payments** | `/v1/transfers`, `/v1/payments` | Bilateral transfers & outward settlement | NGN <-> XOF, NIP |
| **Merchant** | `/v1/merchant/checkout`, `/v1/merchant/accounts` | Dynamic QR & virtual NUBANs | Nigeria & Niger |
| **Wallets** | `/v1/wallets` | Multi-currency sub-ledgers & holds | NGN, XOF, USD |
| **Agency** | `/v1/agency/cash-in`, `/v1/agency/cash-out` | Smart POS terminal transactions | Regional Networks |
| **FX Corridor** | `/v1/fx/corridor-rates`, `/v1/fx/quote` | Guaranteed 60s rate locks | NGN/XOF Bilateral |
| **KYC / KYB** | `/v1/kyc/verify-identity` | Biometric BVN, NIN, NIF, CAC lookups | NDPR & CENTIF |
| **Customers** | `/v1/customers` | Unified customer identity profiles | Multi-tenant |
| **Bills & VAS**| `/v1/bills/electricity`, `/v1/bills/airtime` | DisCo prepaid tokens & telco top-up | IKEDC, AEDC, Airtel |

---

## 2. Core Endpoints Specification
- `POST /v1/transfers/cross-border`: Initiates instant bilateral settlement with guaranteed FX rate lock.
- `GET /v1/payments/{reference}/verify`: Authoritative switch and core ledger status verification.
- `POST /v2/nip-gateway/outward`: Outward interbank dispatch through Providus Bank Nigeria NIP switch.
- `POST /v1/merchant/checkout`: Creates dynamic checkout session with dedicated Providus virtual account and QR payload.
