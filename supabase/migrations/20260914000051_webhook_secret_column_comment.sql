-- ==============================================================================
-- KORIEPAY — DOCUMENT THE ENCRYPTED-NOT-HASHED MERCHANT WEBHOOK SECRET COLUMN
-- Migration: 20260914000051_webhook_secret_column_comment.sql
-- ==============================================================================
--
-- Fixes a real defect (Task I / Phase 0-1): public.merchant_webhook_endpoints
-- .secret_hash was being written with the RAW webhook signing secret despite
-- its name implying a one-way hash (see src/app/api/v1/merchant/webhooks/
-- route.ts before this change). Any reader with database access to this
-- column could forge valid HMAC signatures on webhook payloads for that
-- merchant's endpoint.
--
-- The application-layer fix (src/lib/security/webhookSecretCrypto.ts,
-- applied in the same change as this migration) now AES-256-GCM-encrypts
-- the secret before every write and decrypts it only at the moment a
-- signature actually needs to be computed. A one-way hash (correct for
-- merchant_api_keys.secret_key_hash) does not work here because the
-- plaintext must be recoverable to sign outgoing webhook deliveries.
--
-- This migration only documents that behavior on the column itself, so a
-- future reader of the schema (or another migration author) does not
-- repeat the original mistake of treating this column as a safe one-way
-- hash. The column is intentionally NOT renamed, to avoid touching every
-- existing read/write call site in a security-fix migration; the doubt is
-- resolved by making the comment unambiguous instead.
-- ==============================================================================

COMMENT ON COLUMN public.merchant_webhook_endpoints.secret_hash IS
  'AES-256-GCM encrypted webhook signing secret (iv:authTag:ciphertext, hex), '
  'NOT a one-way hash despite the column name — see '
  'src/lib/security/webhookSecretCrypto.ts. Reversible by design: KoriePay '
  'must recover the plaintext to compute the outgoing HMAC signature on '
  'every webhook delivery. Column name kept for backward compatibility with '
  'existing reads/writes rather than a renaming migration.';
