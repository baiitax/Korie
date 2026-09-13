/**
 * Best-effort client IP extraction for rate-limiting keys on public,
 * unauthenticated endpoints (registration, onboarding applications,
 * contact/newsletter forms) where there is no account/API-key identifier
 * yet to key the limiter on. Mirrors the same `x-forwarded-for` parsing
 * already used ad hoc across the codebase (authMiddleware.ts, audit-log
 * writers, etc.) so this isn't a new convention, just a shared helper for
 * it. Trusts the platform's edge/proxy to set this header honestly — it is
 * NOT a substitute for per-account/device abuse controls, only a floor
 * against trivial scripted volumetric abuse.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Sliding-window rate limiter with per-endpoint and per-credential thresholds.
 */
export function checkRateLimit(
  identifier: string,
  category: 'FINANCIAL' | 'READ' | 'AUTH' | 'WEBHOOK' | 'REGISTRATION' | 'DEFAULT' = 'DEFAULT',
  customLimit?: number
): RateLimitResult {
  const windowMs = 60 * 1000; // 1-minute window
  const limits: Record<string, number> = {
    FINANCIAL: 300,   // 300 rpm for money-moving endpoints
    READ: 1200,       // 1200 rpm for status/verify reads
    AUTH: 60,         // 60 rpm for login / key verification
    WEBHOOK: 600,     // 600 rpm for webhook ingestion
    REGISTRATION: 8,  // 8 rpm per IP — public account-creation/application
                       // endpoints have no account identifier to key on yet,
                       // so this is intentionally tight to blunt scripted
                       // mass-signup / identity-farming abuse while still
                       // allowing a real applicant to retry a typo.
    DEFAULT: 600,
  };

  const limit = customLimit || limits[category] || 600;
  const now = Date.now();
  const key = `${category}:${identifier}`;

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    allowed: true,
    limit,
    remaining,
    resetSeconds,
  };
}
