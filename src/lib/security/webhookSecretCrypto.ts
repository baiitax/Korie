/**
 * src/lib/security/webhookSecretCrypto.ts
 *
 * Symmetric encryption for merchant webhook signing secrets at rest.
 *
 * Fixes a real defect: public.merchant_webhook_endpoints.secret_hash was
 * being written with the RAW signing secret (see the POST handler in
 * src/app/api/v1/merchant/webhooks/route.ts before this change) despite the
 * column name implying it held a hash. Any reader with database access —
 * including a leaked service-role key, a compromised admin session, or a
 * future careless SELECT * exposed through some other endpoint — could
 * read the plaintext secret and forge valid HMAC signatures on webhook
 * payloads delivered to that merchant's endpoint, or replay/fabricate
 * events KoriePay never actually sent.
 *
 * A one-way hash (like merchant_api_keys.secret_key_hash, which is correct
 * for that table) does NOT work here: unlike an API key or password, this
 * secret must be read back in plaintext every time KoriePay dispatches a
 * webhook, in order to compute the outgoing HMAC-SHA256 signature the
 * merchant's endpoint verifies against. That means it needs reversible
 * encryption, not a one-way hash — the same shape of problem
 * src/lib/security/identifierCrypto.ts already solves for BVN/NIN, so this
 * mirrors that module's AES-256-GCM pattern exactly, with its own
 * dedicated key (WEBHOOK_SECRET_ENCRYPTION_KEY) rather than reusing the KYC
 * identifier key — a compromise of one secret class should not also expose
 * the other.
 *
 * Fails loudly (throws) if the encryption key is not configured, matching
 * the established "never fall back to storing plaintext" pattern used for
 * KYC identifiers.
 */

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("WEBHOOK_SECRET_ENCRYPTION_KEY is not configured (expected a 64-char hex string).");
  }
  return Buffer.from(hex, "hex");
}

/** Encrypts a plaintext webhook signing secret. Returns `iv:authTag:ciphertext`, all hex. */
export function encryptWebhookSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Decrypts a value produced by {@link encryptWebhookSecret}. */
export function decryptWebhookSecret(payload: string): string {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted webhook secret payload.");
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
