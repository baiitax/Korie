/**
 * src/lib/security/identifierCrypto.ts
 *
 * Symmetric encryption for sensitive national identifiers (BVN, NIN, NIF,
 * NNI, …) at rest. KoriePay never stores a BVN/NIN in plaintext and never
 * returns the plaintext value to any client after capture — only a masked
 * preview (e.g. "223****891") is ever rendered, matching NIBSS/NIMC display
 * conventions for these numbers.
 *
 * AES-256-GCM is used (authenticated encryption): tampering with the stored
 * ciphertext is detectable, not just decryptable-or-not. The key comes from
 * KYC_IDENTIFIER_ENCRYPTION_KEY (a 32-byte hex string), which must be present
 * in the deployment environment — if it is missing, capture fails loudly
 * rather than falling back to storing plaintext.
 */

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.KYC_IDENTIFIER_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("KYC_IDENTIFIER_ENCRYPTION_KEY is not configured (expected a 64-char hex string).");
  }
  return Buffer.from(hex, "hex");
}

/** Encrypts a plaintext identifier. Returns `iv:authTag:ciphertext`, all hex. */
export function encryptIdentifier(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Decrypts a value produced by {@link encryptIdentifier}. */
export function decryptIdentifier(payload: string): string {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted identifier payload.");
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}

/**
 * Masks a numeric identifier for display: first 3 and last 3 digits are
 * shown, everything in between becomes `*`. An 11-digit BVN/NIN like
 * `22312345891` becomes `223*****891`. Never used to derive anything other
 * than a display string — the encrypted value is the only thing persisted.
 */
export function maskIdentifier(plaintext: string): string {
  const digits = plaintext.replace(/\D/g, "");
  if (digits.length <= 6) return "*".repeat(digits.length);
  const head = digits.slice(0, 3);
  const tail = digits.slice(-3);
  const stars = "*".repeat(digits.length - 6);
  return `${head}${stars}${tail}`;
}

/** BVN and NIN are both 11-digit numeric identifiers in Nigeria. */
export function isValidElevenDigitId(value: string): boolean {
  return /^\d{11}$/.test(value.trim());
}
