import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface OpsAuthResult {
  isAuthorized: boolean;
  userId?: string;
  orgId?: string;
  roleName?: string;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Authorizes a back-office/ops action (settlement runs, KYC review, limit
 * overrides, dispute resolution) by validating a real Supabase session AND
 * checking the caller's public.organization_members role against an
 * allow-list. This is real RBAC backed by the database — not a client
 * -asserted role string.
 */
export async function authorizeOpsRequest(
  request: NextRequest,
  allowedRoles: string[]
): Promise<OpsAuthResult> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAuthorized: false, errorCode: 'UNAUTHORIZED_MISSING_TOKEN', errorMessage: 'Missing session token.', httpStatus: 401 };
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  const admin = getSupabaseAdminClient();

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return { isAuthorized: false, errorCode: 'UNAUTHORIZED_INVALID_SESSION', errorMessage: 'Invalid or expired session.', httpStatus: 401 };
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (!profile) {
    return { isAuthorized: false, errorCode: 'PROFILE_NOT_FOUND', errorMessage: 'No user profile found for this account.', httpStatus: 403 };
  }

  const { data: membership } = await admin
    .from('organization_members')
    .select('org_id, status, roles(name)')
    .eq('user_id', profile.id)
    .eq('status', 'ACTIVE');

  const match = (membership || []).find((m: any) => allowedRoles.includes(m.roles?.name));

  if (!match) {
    return { isAuthorized: false, errorCode: 'FORBIDDEN_ROLE', errorMessage: 'Your role is not authorized to perform this action.', httpStatus: 403 };
  }

  return {
    isAuthorized: true,
    userId: userData.user.id,
    orgId: (match as any).org_id,
    roleName: (match as any).roles?.name,
  };
}
