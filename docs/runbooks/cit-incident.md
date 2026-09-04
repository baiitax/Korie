# Operational Runbook: CIT Shipment Incident Response

## 1. Incident Triggers
- Tamper-evident seal serial mismatch upon receipt.
- Physical short-delivery (counted cash $<$ sealed manifest value).
- Armored vehicle GPS signal loss $> 15\text{ minutes}$ or route corridor deviation.
- Physical damage to cash bag or armored container.

---

## 2. Emergency Response Procedures
1. **Quarantine Shipment**: The receiving vault supervisor refuses standard acceptance and marks shipment status as `INCIDENT_QUARANTINE`.
2. **Dual-Custody Video Count**: Two custodians perform a denomination count under continuous CCTV monitoring.
3. **Escalate to SOC**: Security Operations Center and CIT provider management are alerted immediately.
4. **Discrepancy Logging**: System logs `cit_incidents` with variance amount, seal photographs, and courier driver signatures.
5. **Insurance & Legal Filing**: Automated incident pack compiled for underwriter and law enforcement if loss is confirmed.
