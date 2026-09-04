/**
 * Cryptographic Data Minimization and PII Masking Utilities
 * Enforces Zero Credential Exposure and Data Protection rules across logs, API responses, and UI.
 */

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••';
  const prefix = key.slice(0, 8);
  const suffix = key.slice(-4);
  return `${prefix}••••••••••••••••••••••••${suffix}`;
}

export function maskBvn(bvn: string): string {
  if (!bvn) return '';
  if (bvn.length < 8) return '••••••••';
  return `${bvn.slice(0, 3)}•••••${bvn.slice(-3)}`;
}

export function maskNin(nin: string): string {
  if (!nin) return '';
  if (nin.length < 8) return '••••••••';
  return `${nin.slice(0, 3)}•••••${nin.slice(-3)}`;
}

export function maskCardPan(pan: string): string {
  if (!pan) return '';
  const cleanPan = pan.replace(/\s+/g, '');
  if (cleanPan.length < 10) return '••••••••';
  return `${cleanPan.slice(0, 4)} •••• •••• ${cleanPan.slice(-4)}`;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  if (phone.length < 8) return '••••••••';
  return `${phone.slice(0, 4)}••••${phone.slice(-3)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '••••@••••.•••';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `*@${domain}`;
  return `${user.slice(0, 2)}••••${user.slice(-1)}@${domain}`;
}

/**
 * Recursively strips/masks sensitive financial & auth keys before logging or serialization.
 */
export function sanitizePayloadForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizePayloadForLogging);
  }

  const sensitiveKeys = [
    'password', 'pin', 'otp', 'secret', 'secret_key', 'api_key', 'private_key',
    'bvn', 'nin', 'nif', 'cvv', 'card_number', 'pan', 'auth_token', 'token'
  ];

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(s => lowerKey.includes(s))) {
      sanitized[key] = typeof value === 'string' ? maskApiKey(value) : '[REDACTED_SENSITIVE_FIELD]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizePayloadForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
