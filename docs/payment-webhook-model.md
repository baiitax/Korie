# Webhook Intake, Ingestion & Replay Architecture

## 1. Zero-Trust Webhook Ingestion Pipeline
1. **Raw Body Capture**: Ingest incoming raw payload string and signature headers before JSON deserialization.
2. **HMAC Signature Verification**: Compute HMAC-SHA256 / SHA512 using provider secret keys. Reject invalid signatures with HTTP 401.
3. **Audit Log Persistence**: Write raw event to `provider_webhook_events` table immediately.
4. **Idempotency Guard**: Check if event `(provider_id, external_event_id)` has already been processed. Return HTTP 200 immediately if duplicate.
5. **Asynchronous Execution & State Update**: Update `payment_attempts`, resolve payment status, and trigger General Ledger journal posting.
