# Disaster Recovery Runbooks & Standard Operating Procedures

## 1. Runbook Index
- **DR-SOP-01**: Primary Database Outage & Point-In-Time Restoration
- **DR-SOP-02**: Core Double-Entry Ledger Invariant Violation Response
- **DR-SOP-03**: Payment Switch / Banking Partner Outage (Providus / Koris)
- **DR-SOP-04**: Dead-Letter Queue (DLQ) Mass Failure & Idempotent Replay
- **DR-SOP-05**: Credential / API Secret Compromise Rotation Protocol

---

## 2. DR-SOP-01: Primary Database Outage & PITR
1. **Detection**: Health probe `/api/health/database` fails 3 consecutive pings.
2. **Containment**:
   - Activate **Financial Safe Mode**: `POST /api/core/v1/resilience/safe-mode` (`enabled: true`).
   - Stop background queue consumers.
3. **Execution**:
   - Restore database to latest valid point-in-time timestamp (e.g. $T-15\text{m}$).
   - Execute 7-step post-recovery validation: `POST /api/core/v1/resilience/recovery-validate`.
4. **Verification**:
   - Assert `Total Debits == Total Credits` across all Chart of Accounts.
   - Assert zero unverified duplicate idempotency keys.
5. **Reopening**:
   - Deactivate Safe Mode and resume worker consumption.
   - File SEV-1 incident postmortem report.

---

## 3. DR-SOP-04: Dead-Letter Queue Idempotent Replay
1. Inspect DLQ messages: `GET /api/core/v1/resilience/dead-letter-queue`.
2. Analyze root-cause error traces (e.g., downstream schema mismatch, network timeout).
3. Deploy bugfix or verify external provider availability.
4. Execute idempotent single or batch replay: `POST /api/core/v1/resilience/dead-letter-queue/[id]/replay`.
5. Verify zero duplicate ledger entries created.
