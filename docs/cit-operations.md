# Cash-in-Transit (CIT) Management, Security Containers & Custody Chain

## 1. CIT Shipment Lifecycle & State Machine
CIT shipments transport physical cash between vaults, partner bank branches, cash centers, and agency banking hubs.

$$\text{REQUESTED} \rightarrow \text{APPROVED} \rightarrow \text{PREPARED} \rightarrow \text{SEALED} \rightarrow \text{PICKED\_UP} \rightarrow \text{IN\_TRANSIT} \rightarrow \text{ARRIVED} \rightarrow \text{RECEIVED} \rightarrow \text{COUNTED} \rightarrow \text{VERIFIED} \rightarrow \text{RECONCILED}$$

**Exception States**: `DELAYED`, `TAMPERED`, `SHORT_DELIVERY`, `OVER_DELIVERY`, `ROUTE_DEVIATION`, `LOST`, `INCIDENT`.

---

## 2. Containers, Barcodes & Tamper-Evident Seals
- **Containers**: Sealed Cash Bags, High-Security Cash Boxes, ATM Cassettes, Armored Safes.
- **Seal Verification**: Every shipment records unique tamper-evident seal serial numbers (e.g. `SEAL-NG-991823`).
- **Immutable Custody Hash Chain**: Each custody transition records `(event_id, previous_event_hash, shipment_id, actor_id, actor_role, location, timestamp, device_id)`.
- **Seal Mismatch Protocol**: If a receiving vault finds a broken, missing, or mismatched seal, an immediate `CRITICAL` cash security incident is dispatched to SOC and the shipment is quarantined.
