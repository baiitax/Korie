# Agency Banking & Physical Channels Relational Data Model

## 1. Schema Tables Overview
- `agents`: Master agent entity profile, legal entity, KYC/KYB status, tier, and risk rating.
- `aggregators`: Super-agent organizations managing multi-agent fleets and float pools.
- `agent_locations`: Physical branches and authorized mobile geofence zones.
- `agency_devices`: Hardware trust registry, fingerprints, and attestation scores.
- `agency_terminals`: POS terminal serials, hardware models, capabilities, and assignment state.
- `agent_cash_positions`: Physical cash till tracking and denomination counts.
- `agent_cash_reconciliations`: End-of-day cash reconciliation records and discrepancy logs.
- `agency_consumer_complaints`: Consumer claims, SLA clocks, and linked GL compensation journals.
