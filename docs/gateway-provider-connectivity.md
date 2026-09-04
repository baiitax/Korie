# Provider Connectivity Layer, Health Engine & Circuit Breakers

## 1. Provider Adapter Framework
Upstream banking nodes and rail processors are decoupled through canonical Provider Adapters:
- `ProvidusBankAdapter`: NIP outward clearing, virtual accounts, direct settlement.
- `KorisBankAdapter`: BCEAO SIP transfers, WAEMU regional clearing, cash operations.
- `KycProviderAdapter`: NIN/BVN and sovereign biometric verification.
- `SmsEmailMessagingAdapter`: Multi-channel transactional OTP and status alerts.

---

## 2. Canonical Status Normalization
Provider-specific status responses are translated into KoriePay's normalized model:
- `INITIATED` | `SUBMITTED` | `PROCESSING` | `SUCCESS` | `FAILED` | `UNKNOWN` | `REVERSED`

---

## 3. Circuit Breakers & State-Aware Failover
- **Circuit States**: `CLOSED` (Normal) $\rightarrow$ `OPEN` (High Failure Rate $>20\%$) $\rightarrow$ `HALF_OPEN` (Trialing).
- **State-Aware Failover Invariant**: If an outbound transfer was already submitted to Provider A and timed out (`UNKNOWN`), the Gateway **never** blindly fails over to Provider B. Instead, it triggers `queryTransactionStatus()` to prevent duplicate debits.
