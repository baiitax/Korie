import { createErrorResponse } from '@/lib/security/apiResponse';
import type { AuthenticatedAggregatorStaffContext } from '@/lib/security/aggregatorAuth';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Phase B (F4) — aggregator MFA step-up enforcement.
 *
 * Built entirely on Supabase Auth's own native TOTP factor primitive
 * (auth.mfa.enroll/challenge/verify, already shipped by Supabase — see
 * GoTrueClient's `mfa` namespace) rather than a bespoke secret store: a
 * staff member's `verified` factor list is the single source of truth, so
 * there is nothing here to keep in sync or leak. This module only adds the
 * two things Supabase doesn't provide out of the box:
 *
 *   1. An organization-level opt-in switch (aggregators.mfa_required) that
 *      an AGGREGATOR_OWNER/AGGREGATOR_ADMIN can turn on to require every
 *      staff member of their org to have MFA enrolled before performing
 *      any permission-gated action.
 *   2. The actual live check, evaluated fresh on every privileged request
 *      (never cached) against the caller's real factor list, so removing
 *      a factor revokes the privilege immediately rather than at next
 *      login.
 */

export interface AggregatorMfaCheckResult {
  ok: boolean;
  hasVerifiedFactor: boolean;
  orgRequiresMfa: boolean;
}

/**
 * Resolves whether the calling staff member currently satisfies this
 * aggregator organization's MFA requirement. Always returns hasVerifiedFactor
 * honestly (even when the org doesn't require it) so callers/UI can show
 * "MFA enabled" status regardless of enforcement.
 */
export async function checkAggregatorMfa(
  admin: SupabaseClient,
  staff: AuthenticatedAggregatorStaffContext,
): Promise<AggregatorMfaCheckResult> {
  const { data: aggRow } = await admin
    .from('aggregators')
    .select('mfa_required')
    .eq('id', staff.aggregatorId)
    .maybeSingle();

  const orgRequiresMfa = Boolean(aggRow?.mfa_required);

  const { data: userData } = await admin.auth.admin.getUserById(staff.authUserId);
  const factors = userData?.user?.factors || [];
  const hasVerifiedFactor = factors.some((f: any) => f.status === 'verified');

  return {
    ok: !orgRequiresMfa || hasVerifiedFactor,
    hasVerifiedFactor,
    orgRequiresMfa,
  };
}

/**
 * Server-side gate: call after authenticateAggregatorRequest() (and
 * typically alongside requireAggregatorPermission) for any action that
 * moves money or changes privileged state. Returns a ready-to-return 403
 * when the org requires MFA and this staff member hasn't enrolled a
 * verified TOTP factor.
 */
export async function requireAggregatorMfaIfEnforced(
  admin: SupabaseClient,
  staff: AuthenticatedAggregatorStaffContext,
): Promise<{ ok: true } | { ok: false; response: ReturnType<typeof createErrorResponse> }> {
  const result = await checkAggregatorMfa(admin, staff);
  if (result.ok) return { ok: true };

  return {
    ok: false,
    response: createErrorResponse({
      code: 'MFA_REQUIRED',
      message:
        'Your aggregator organization requires multi-factor authentication for this action. Enroll a TOTP authenticator from Security & Access Control before continuing.',
      requestId: staff.requestId,
      httpStatus: 403,
    }),
  };
}
