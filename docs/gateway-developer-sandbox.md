# Developer Portal, Deterministic Sandbox & Production Certification

## 1. Sandbox Isolation & Deterministic Scenarios
The KoriePay Developer Sandbox provides a realistic test harness that is strictly isolated from production ledgers, real banking nodes, and live settlement accounts.

### Supported Simulation Scenarios via Request Headers:
- `x-simulation-scenario: SUCCESS` $\rightarrow$ Simulates instant payment completion.
- `x-simulation-scenario: PROVIDER_TIMEOUT` $\rightarrow$ Simulates 30s upstream gateway timeout and marks payment `UNKNOWN`.
- `x-simulation-scenario: INSUFFICIENT_FUNDS` $\rightarrow$ Rejection with standard core banking error codes.
- `x-simulation-scenario: AML_STEP_UP` $\rightarrow$ Triggers compliance review hold.

---

## 2. Sandbox to Production Certification Checklist
Before receiving production credentials, partner applications must verify:
- Idempotency key handling.
- HMAC-SHA256 webhook signature validation.
- Exponential backoff retry semantics on 5xx errors.
- Correct handling of `UNKNOWN` transaction states.
