import crypto from 'crypto';

/**
 * Generates an RFC-compliant HMAC-SHA256 signature for outgoing webhook notifications.
 */
export function generateWebhookSignature(payload: string, secretKey: string, timestamp?: number): { signatureHeader: string; timestamp: number } {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('hex');

  const signatureHeader = `t=${ts},v1=${signature}`;
  return { signatureHeader, timestamp: ts };
}

/**
 * Verifies an incoming webhook HMAC-SHA256 signature using constant-time comparison.
 * Protects against timing attacks and replay attacks (tolerance: 300 seconds).
 */
export function verifyWebhookSignature(
  rawPayload: string,
  signatureHeader: string,
  secretKey: string,
  toleranceSeconds: number = 300
): { isValid: boolean; reason?: string } {
  if (!signatureHeader || !signatureHeader.includes('t=') || !signatureHeader.includes('v1=')) {
    return { isValid: false, reason: 'MALFORMED_SIGNATURE_HEADER' };
  }

  const parts = signatureHeader.split(',');
  const tPart = parts.find(p => p.startsWith('t='));
  const sigPart = parts.find(p => p.startsWith('v1='));

  if (!tPart || !sigPart) {
    return { isValid: false, reason: 'MISSING_SIGNATURE_PARTS' };
  }

  const timestamp = parseInt(tPart.split('=')[1], 10);
  const providedSignature = sigPart.split('=')[1];
  const now = Math.floor(Date.now() / 1000);

  // Check timestamp tolerance to prevent replay attacks
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return { isValid: false, reason: 'SIGNATURE_TIMESTAMP_EXPIRED' };
  }

  const signedPayload = `${timestamp}.${rawPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('hex');

  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    return { isValid: isMatch, reason: isMatch ? undefined : 'SIGNATURE_MISMATCH' };
  } catch (err) {
    return { isValid: false, reason: 'CRYPTOGRAPHIC_COMPARISON_FAILED' };
  }
}
