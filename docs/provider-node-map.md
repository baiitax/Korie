# KORIEPAY SUPER ADMIN — PROVIDER NODE & BANKING INTEGRATION MAP

## 1. Banking Nodes Matrix

| Attribute | 🇳🇬 Providus Bank Gateway | 🇳🇪 Koris Bank Gateway | 🌍 KoriePay Core Gateway |
|---|---|---|---|
| **Node ID** | `providus_ng` | `koris_ne` | `korie_core` |
| **Institution** | Providus Bank Plc | Koris Bank SA | KoriePay Financial Engine |
| **Country** | Nigeria | Niger Republic | Multi-Market / Global |
| **Base Currency** | Nigerian Naira (NGN ₦) | CFA Franc (XOF CFA) | Multi-Currency (NGN/XOF/USD) |
| **Protocol** | REST / ISO 8583 / NIP Switch | REST / GIM-UEMOA / WAEMU | Asynchronous Event-Driven Microservices |
| **Latency SLA** | < 160ms | < 200ms | < 50ms |
| **Settlement** | T+0 Automated Clearing | T+0 Bilateral Gross | Double-Entry Cryptographic Ledger |
| **Webhooks** | HMAC-SHA256 Signed Ingest | HMAC-SHA256 Signed Ingest | Dual-Signature Dispatcher |

## 2. Failover Protocol
In the event of a provider switch degradation or upstream Central Bank maintenance window:
1. Automated Telemetry detects 3 consecutive latency spikes or timeouts.
2. System triggers a `WARNING` or `CRITICAL` alert in the Super Admin Intelligence Banner.
3. Administrator can review the Maker-Checker queue to approve secondary provider failover.
4. Transaction traffic gracefully routes to secondary liquidity channels with zero double-charge risk.
