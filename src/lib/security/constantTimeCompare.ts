import { timingSafeEqual } from "crypto";

/**
 * Constant-time string equality check.
 *
 * Plain `===` on a secret comparison leaks timing information proportional
 * to how many leading characters match, which an attacker with enough
 * requests can use to recover the secret one character at a time. This
 * repo already uses `crypto.timingSafeEqual` for webhook HMAC verification
 * (hmacSignature.ts) and the agency PIN check (api/v1/agency/settings/pin);
 * this helper applies the same standard to every other bearer-secret
 * comparison (e.g. the cron endpoints' CRON_SECRET check) so the practice
 * is consistent rather than ad hoc.
 *
 * `timingSafeEqual` throws if the two buffers have different lengths, so
 * that case is handled explicitly up front — returning `false` immediately
 * for a length mismatch does not leak useful timing information beyond
 * "the lengths differ", which is unavoidable and not sensitive for a
 * fixed-length, high-entropy secret.
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
