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
  category: 'FINANCIAL' | 'READ' | 'AUTH' | 'WEBHOOK' | 'DEFAULT' = 'DEFAULT',
  customLimit?: number
): RateLimitResult {
  const windowMs = 60 * 1000; // 1-minute window
  const limits: Record<string, number> = {
    FINANCIAL: 300, // 300 rpm for money-moving endpoints
    READ: 1200,     // 1200 rpm for status/verify reads
    AUTH: 60,       // 60 rpm for login / key verification
    WEBHOOK: 600,   // 600 rpm for webhook ingestion
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
