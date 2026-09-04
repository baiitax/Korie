# Financial Disaster Recovery & Business Continuity Plan

## 1. Objectives (RPO & RTO)
- **Recovery Point Objective (RPO)**: **0 seconds** for committed journal entries (enforced by synchronous multi-AZ PostgreSQL replication).
- **Recovery Time Objective (RTO)**: **< 60 seconds** for automated ledger failover.

## 2. Point-in-Time Ledger Reconstruction
If database corruption or state divergence occurs:
1. Revert to the last verified cryptographic daily close snapshot.
2. Replay all journal lines from the immutable event log.
3. Call `POST /api/core/v1/ledger/rebuild` to reconstruct all account balance projections from genesis.
4. Verify trial balance zero-variance.
