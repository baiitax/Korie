import { createErrorResponse } from '@/lib/security/apiResponse';
import type { AuthenticatedAggregatorStaffContext } from '@/lib/security/aggregatorAuth';
import { requireAggregatorMfaIfEnforced } from '@/lib/security/aggregatorMfa';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  AGGREGATOR_PERMISSIONS,
  aggregatorRoleHasPermission,
  type AggregatorPermission,
} from '@/lib/aggregator/permissions';

/**
 * Server-side authorization gate for privileged /api/v1/aggregator routes.
 * The permission matrix itself lives in src/lib/aggregator/permissions.ts
 * (a client-safe module with no server-only imports, so the same matrix
 * can also drive UI-level button gating); this file adds the
 * request-rejecting behavior API routes need.
 *
 * This closes a real gap found in the September 2026 portal review: staff
 * roles existed (aggregator_staff_users.role, 9 values) and were declared
 * on every authenticated context, but only 2 of ~15 privileged write
 * routes actually checked the role before acting — meaning a read-only
 * AUDITOR or ANALYST account could dispatch float, mint a production API
 * key, or trigger a settlement run. This registry is the single source of
 * truth fixing that; routes must never re-derive their own ad-hoc role
 * checks going forward.
 */
export { AGGREGATOR_PERMISSIONS, aggregatorRoleHasPermission };
export type { AggregatorPermission };

/**
 * Server-side authorization gate for a privileged aggregator action.
 * Call after authenticateAggregatorRequest() has already produced a
 * `staff` context; returns a ready-to-return 403 response when the
 * caller's role does not carry the required permission, or `{ ok: true }`
 * when it does. One implementation — routes never re-derive their own
 * role allowlists.
 */
export function requireAggregatorPermission(
  staff: AuthenticatedAggregatorStaffContext,
  permission: AggregatorPermission,
): { ok: true } | { ok: false; response: ReturnType<typeof createErrorResponse> } {
  if (aggregatorRoleHasPermission(staff.role, permission)) {
    return { ok: true };
  }
  return {
    ok: false,
    response: createErrorResponse({
      code: 'FORBIDDEN_PERMISSION',
      message: `Your role (${staff.role}) does not include the "${permission}" capability. Contact your aggregator owner/admin if you believe this is wrong.`,
      requestId: staff.requestId,
      httpStatus: 403,
    }),
  };
}

/**
 * Combined gate for privileged aggregator actions: checks the role-based
 * permission (requireAggregatorPermission) AND, if this organization has
 * opted into org-wide MFA enforcement (aggregators.mfa_required — Phase B
 * / F4), that the calling staff member actually has a verified TOTP
 * factor. Every one of the 12 privileged aggregator routes that already
 * call requireAggregatorPermission should use this combined check instead
 * so MFA enforcement, once an org turns it on, applies uniformly across
 * every money-moving/state-changing action rather than needing to be
 * re-wired route by route.
 */
export async function requireAggregatorAuthorization(
  staff: AuthenticatedAggregatorStaffContext,
  permission: AggregatorPermission,
): Promise<{ ok: true } | { ok: false; response: ReturnType<typeof createErrorResponse> }> {
  const permCheck = requireAggregatorPermission(staff, permission);
  if (!permCheck.ok) return permCheck;

  const admin = getSupabaseAdminClient();
  const mfaCheck = await requireAggregatorMfaIfEnforced(admin, staff);
  if (!mfaCheck.ok) return mfaCheck;

  return { ok: true };
}
