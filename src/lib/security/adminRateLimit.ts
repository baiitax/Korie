import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rateLimiter';

/**
 * Rate limiting for the admin/compliance command-center routes
 * (ADMIN_PORTAL_REVIEW.md finding #5).
 *
 * `src/lib/security/rateLimiter.ts` already existed and was already used
 * on public/unauthenticated routes, but nothing in `/api/admin/*` or
 * `/api/compliance/*` called it — a single compromised or malicious admin
 * session (or a leaked long-lived access token) could page through every
 * resource in the registry, including full customer/identity/ledger
 * tables, at whatever rate the client could issue requests.
 *
 * Keyed per AUTHENTICATED ACTOR (auth.userId), not per IP, exactly as the
 * review recommended — these are signed-in sessions, and an actor-keyed
 * limit can't be dodged by rotating source addresses the way an IP-keyed
 * one could. Uses the same categories/thresholds already established in
 * rateLimiter.ts rather than inventing new ones:
 *   READ      — GET/list/detail/facet reads (1200/min per actor)
 *   FINANCIAL — routes that move real money or close the books
 *               (approvals, accounting close, adashi payout authorization,
 *               FX rate changes) (300/min per actor)
 *   DEFAULT   — the generic resource-registry PATCH mutation path
 *               (600/min per actor)
 */
export type AdminRateLimitCategory = 'READ' | 'FINANCIAL' | 'DEFAULT';

export interface AdminRateLimitCheck {
  ok: boolean;
  response?: NextResponse;
}

/**
 * `actorId` should be the caller's stable identity (auth.userId, falling
 * back to email) — never an IP, and never client-supplied. `surface`
 * namespaces admin vs. compliance so the two portals don't share one
 * budget for the same person if they ever hold both roles.
 */
export function enforceAdminRateLimit(
  actorId: string | undefined,
  surface: 'admin' | 'compliance',
  category: AdminRateLimitCategory,
): AdminRateLimitCheck {
  // No identity to key on means auth itself already failed upstream —
  // callers only reach this after authorizeAdminRequest/authorizeComplianceRequest
  // succeeds, so this is a defensive fallback, not the normal path.
  const key = `${surface}:${actorId ?? 'unknown'}`;
  const result = checkRateLimit(key, category);
  if (result.allowed) return { ok: true };

  return {
    ok: false,
    response: NextResponse.json(
      {
        status: 'error',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Try again in ${result.resetSeconds} seconds.`,
        },
      },
      { status: 429, headers: { 'Retry-After': String(result.resetSeconds) } },
    ),
  };
}
