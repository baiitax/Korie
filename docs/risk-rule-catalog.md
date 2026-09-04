# Risk Rule Catalog

## 1. Rule Structure & Schema
Every rule is versioned, auditable, and evaluates against structured signal inputs:
- `ruleId`: Unique string identifier (e.g. `RR-TXN-001`).
- `version`: Integer version number.
- `scope`: Target entity (`CUSTOMER`, `AGENT`, `MERCHANT`, `AGGREGATOR`, `GLOBAL`).
- `conditions`: Array of predicates (`field`, `operator`, `value`).
- `scoreDelta`: Integer score increment (0 to +100).
- `overrideAction`: Immediate action if triggered (`ALLOW_WITH_STEP_UP`, `REVIEW`, `HOLD`, `DECLINE`, `BLOCK`).

---

## 2. Production Rule Catalog Matrix

| Rule ID | Rule Name | Scope | Condition | Action | Score Delta | Description |
|---|---|---|---|---|---|---|
| `RR-DEV-001` | Unknown / New Device Signature | GLOBAL | `is_new_device == true` | `ALLOW_WITH_STEP_UP` | +25 | Transaction initiated from a hardware hash never seen on account. |
| `RR-DEV-002` | Rapid Multi-Account Device Switching | GLOBAL | `device_accounts_count_24h >= 4` | `HOLD` | +55 | Single device switching between 4+ distinct customer/agent accounts in 24h. |
| `RR-GEO-001` | Geovelocity / Impossible Travel | GLOBAL | `geovelocity_kmh > 800` | `HOLD` | +70 | Distance between successive logins implies impossible physical travel. |
| `RR-NET-001` | High-Risk VPN / Tor / Proxy Node | GLOBAL | `is_vpn_or_proxy == true` | `ALLOW_WITH_STEP_UP` | +30 | Connection originates from known anonymizer or commercial data center IP. |
| `RR-TXN-001` | High-Value First-Time Beneficiary | CUSTOMER | `is_new_beneficiary == true AND amount_minor > 50000000` | `REVIEW` | +40 | Large transfer (> ₦500,000) to an unverified new counterparty. |
| `RR-VEL-001` | Velocity Burst (10-Minute Count) | CUSTOMER | `txn_count_10m >= 5` | `HOLD` | +50 | 5 or more outbound transfers initiated within 10 minutes. |
| `RR-VEL-002` | Velocity Burst (1-Hour Volume) | CUSTOMER | `txn_volume_1h_minor > 200000000` | `REVIEW` | +45 | Cumulative volume in 1 hour exceeds ₦2,000,000. |
| `RR-AGT-001` | Agent Float Cycling / Self-Dealing | AGENT | `same_counterparty_count_24h >= 10` | `HOLD` | +65 | Agent cycling cash-in/cash-out through identical customer phone/account. |
| `RR-AGT-002` | Agent Off-Hours High Velocity | AGENT | `is_off_hours == true AND txn_count_1h >= 15` | `REVIEW` | +50 | High volume processing between 00:00 and 05:00 local time. |
| `RR-MER-001` | Merchant Chargeback / Dispute Spike | MERCHANT | `chargeback_rate_bps > 150` | `HOLD` | +60 | Merchant dispute rate exceeds 1.5% of total processing volume. |
| `RR-BDC-001` | BDC Rapid Currency Arbitrage | BDC | `fx_conversion_velocity_1h >= 6` | `REVIEW` | +40 | Excessive high-frequency FX swaps exceeding daily threshold. |
