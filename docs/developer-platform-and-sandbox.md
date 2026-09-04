# Developer Platform & Deterministic Sandbox Harness

## 1. Developer Onboarding & Credential Generation

Developers integrate with KoriePay via an interactive, self-service developer portal:
1. **Organization Setup**: Create sandbox applications with scoped API credentials.
2. **Deterministic Test Scenarios**: Inject custom simulation headers to test application resilience:
   - `x-simulation-scenario: SUCCESS` $\rightarrow$ Returns instant HTTP 200 OK with mock payment ref.
   - `x-simulation-scenario: PROVIDER_TIMEOUT` $\rightarrow$ Simulates 504 Gateway Timeout resulting in `UNKNOWN` state.
   - `x-simulation-scenario: INSUFFICIENT_FUNDS` $\rightarrow$ Simulates 400 Core Banking Reject.
   - `x-simulation-scenario: AML_STEP_UP` $\rightarrow$ Simulates 403 Step-Up Verification Challenge.

---

## 2. Complete Environment Isolation

- **Zero Production Data Leakage**: The Sandbox environment operates on isolated mock customer accounts and virtual currency pools.
- **Key Prefixing**:
  - Sandbox API Keys: `kp_test_sec_...`
  - Production API Keys: `kp_live_sec_...` (Requires KYB verification).
