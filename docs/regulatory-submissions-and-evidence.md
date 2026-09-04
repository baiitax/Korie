# Regulatory Submissions, Evidence Packs & Restatements

## 1. Submission Adapters & Idempotency Engine

To interface with diverse regulatory channels without hardcoding protocol logic, the platform uses an extensible adapter framework:

- **`API_ADAPTER`**: Direct REST/mTLS HTTPS dispatch to regulatory ingestion endpoints (e.g., NFIU GoAML API).
- **`SFTP_ADAPTER`**: Encrypted SSH file transfer with PGP signature validation.
- **`PORTAL_ADAPTER`**: Automated format preparation for manual upload with receipt reconciliation.

```
┌─────────────────────────────────────────────────────────────┐
│                 REGULATORY SUBMISSION ADAPTER               │
├─────────────────────────────────────────────────────────────┤
│  • prepare(snapshot_id)                                     │
│  • validate_schema(payload)                                 │
│  • submit(idempotency_key)                                  │
│  • query_status(external_ref)                               │
│  • receive_ack(token, receipt_doc)                          │
│  • reconcile_receipt(receipt_hash)                          │
└─────────────────────────────────────────────────────────────┘
```

### Idempotency Enforcement:
Every submission generates an `idempotency_key = SHA256(report_id + snapshot_id + attempt_number)`. Re-executing a submission returns the existing submission record, preventing duplicate filings.

---

## 2. Regulatory Evidence Packs (Audit Vault)

Upon approval, an immutable **Regulatory Evidence Pack** is compiled into a cryptographically sealed ZIP/PDF bundle containing:

1. **Certified Report Document**: The human-readable signed PDF/JSON filing.
2. **Underlying Datasets**: Raw extracted snapshots at reporting cut-off.
3. **Data Quality Scorecard**: Detailed verification of all 8 DQ dimensions.
4. **Financial Reconciliation Certificate**: Signed proof of double-entry equation balance.
5. **Maker-Checker Sign-off**: Timestamps, user IDs, and cryptographic signatures of Preparer, Reviewer, and Approver.
6. **Regulatory Acknowledgment Receipt**: Official timestamp and reference issued by the regulator.

---

## 3. Restatement & Amendment Lifecycle

If a historical error or post-close adjustment is identified:

1. **Original Snapshot Preservation**: The original submitted report snapshot is permanently preserved in status `RESTATED` or `SUPERSEDED`.
2. **Amendment Creation**: An amended report (`v2.0_AMENDED`) is created referencing `original_report_id` and `original_snapshot_id`.
3. **Delta Quantification**: The engine computes exact cell-by-cell delta differences between original and amended values.
4. **Maker-Checker Governance**: Requires explicit executive justification and dual-authorization before resubmission to the regulator.
