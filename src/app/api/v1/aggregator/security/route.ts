import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { requireAggregatorPermission, aggregatorRoleHasPermission } from '@/lib/security/aggregatorPermissions';
import { checkAggregatorMfa } from '@/lib/security/aggregatorMfa';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/security
 *
 * Real security posture for the calling staff member + their organization
 * (Phase B / F4): whether THIS staff member has a verified Supabase Auth
 * TOTP factor enrolled, whether the ORGANIZATION currently requires it for
 * everyone, and the organization's configured IP allowlist (readable by
 * any active staff member — only PATCH is permission-gated).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const mfa = await checkAggregatorMfa(admin, staff);

  const { data: allowlistRows } = await admin
    .from('aggregator_ip_allowlist')
    .select('id, cidr, label, created_at')
    .eq('aggregator_id', staff.aggregatorId)
    .order('created_at', { ascending: false });

  return createSuccessResponse(
    {
      mfa: {
        hasVerifiedFactor: mfa.hasVerifiedFactor,
        organizationRequiresMfa: mfa.orgRequiresMfa,
      },
      ipAllowlist: (allowlistRows || []).map((r: any) => ({
        id: r.id,
        cidr: r.cidr,
        label: r.label,
        createdAt: r.created_at,
      })),
      canManageOrgSecurity: aggregatorRoleHasPermission(staff.role, 'aggregator.security.manage'),
    },
    { code: 'SECURITY_POSTURE_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}

/**
 * PATCH /api/v1/aggregator/security
 *
 * Toggles this organization's mfa_required flag. Owner/Admin only
 * (aggregator.security.manage) — this affects every staff member's login
 * requirements, not just the caller's own.
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  const permCheck = requireAggregatorPermission(staff, 'aggregator.security.manage');
  if (!permCheck.ok) return permCheck.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  if (typeof body.mfaRequired !== 'boolean') {
    return createErrorResponse({ code: 'MISSING_PARAMETERS', message: 'mfaRequired (boolean) is required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Enabling org-wide enforcement requires the requesting Owner/Admin to
  // have their own verified factor first — otherwise an admin could lock
  // out the whole staff (including themselves) from every permission-gated
  // action with no way back in.
  if (body.mfaRequired) {
    const mfa = await checkAggregatorMfa(admin, staff);
    if (!mfa.hasVerifiedFactor) {
      return createErrorResponse({
        code: 'MFA_SELF_ENROLLMENT_REQUIRED',
        message: 'Enroll your own TOTP authenticator before requiring MFA for the whole organization.',
        requestId: staff.requestId,
        httpStatus: 400,
      });
    }
  }

  const { error } = await admin.from('aggregators').update({ mfa_required: body.mfaRequired }).eq('id', staff.aggregatorId);
  if (error) {
    return createErrorResponse({ code: 'SECURITY_UPDATE_FAILED', message: 'Could not update MFA requirement.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: body.mfaRequired ? 'MFA_ENFORCEMENT_ENABLED' : 'MFA_ENFORCEMENT_DISABLED',
    target_type: 'aggregators',
    target_id: staff.aggregatorId,
    result: 'SUCCESS',
    reason: `Organization-wide MFA requirement set to ${body.mfaRequired}.`,
  });

  return createSuccessResponse({ mfaRequired: body.mfaRequired }, { code: 'SECURITY_UPDATED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
