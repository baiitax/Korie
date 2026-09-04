# Providus Bank Nigeria & Koris Bank Niger Banking Integration

## Banking Node Topologies
1. **Providus Bank Nigeria Node (`NG-NODE-PROVIDUS`)**:
   - Clearing Rails: NIBSS Instant Payments (NIP), Direct Debit, Virtual Account Generation.
   - Compliance Hooks: Automated BVN verification via NIBSS, Webhook for Inflow Screening before credit posting.
2. **Koris Bank Niger Republic Node (`NE-NODE-KORIS`)**:
   - Clearing Rails: BCEAO GIM-UEMOA, BCEAO STAR-UEMOA, Regional Mobile Money Interoperability.
   - Compliance Hooks: Automated CENTIF watchpoint validation, UMOA cross-border settlement clearing.

## Failover & Fallback Operations
In the event of a provider API outage, incoming transactions above the automated threshold are queued in an `AWAITING_SETTLEMENT_CLEARANCE` holding pool until connectivity is re-established.
