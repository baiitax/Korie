import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AdminAuthResult {
  isAuthorized: boolean;
  userId?: string;
  orgId?: string;
  roleName?: string;
  email?: string;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * KoriePay Admin Portal authorization.
 *
 * REAL authentication, mirroring `authorizeOpsRequest` (opsAuth.ts) and the
 * other real-ified portals: the caller must present a valid Supabase access
 * token (supabase.auth.signInWithPassword on the client), which is verified
 * server-side via auth.getUser. The profile is resolved from
 * `public.user_profiles`, and the caller must hold an ACTIVE
 * `public.organization_members` membership whose role is on the route's
 * allow-list.
 *
 * Roles are read from the database, never from a client-asserted string, and
 * the /admin shell no longer renders for unauthenticated visitors — this is
 * the fix for the previously unguarded admin portal (audit doc 00, §2).
 *
 * ADMIN_ROLES covers the command center; narrower roles get narrower routes.
 */
export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ORGANIZATION_OWNER',
  'ORGANIZATION_ADMIN',
] as const;

export const ADMIN_READ_ROLES = [...ADMIN_ROLES, 'AGENCY_OPS_ADMIN', 'FINANCE_OFFICER', 'COMPLIANCE_OFFICER'] as const;

export async function authorizeAdminRequest(
  request: NextRequest,
  allowedRoles: readonly string[] = ADMIN_ROLES,
): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAuthorized: false, errorCode: 'UNAUTHORIZED_MISSING_TOKEN', errorMessage: 'Admin session token missing. Please sign in.', httpStatus: 401 };
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return { isAuthorized: false, errorCode: 'UNAUTHORIZED_MISSING_TOKEN', errorMessage: 'Admin session token missing. Please sign in.', httpStatus: 401 };
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return {
      isAuthorized: false,
      errorCode: 'ADMIN_BACKEND_NOT_CONFIGURED',
      errorMessage: 'The admin backend is not configured on this deployment (missing Supabase credentials).',
      httpStatus: 503,
    };
  }

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return { isAuthorized: false, errorCode: 'UNAUTHORIZED_INVALID_SESSION', errorMessage: 'Invalid or expired admin session. Please sign in again.', httpStatus: 401 };
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
    return { isAuthorized: false, errorCode: 'FORBIDDEN_ROLE', errorMessage: 'Your role does not have access to the admin command center.', httpStatus: 403 };
  }

  return {
    isAuthorized: true,
    userId: userData.user.id,
    orgId: (match as any).org_id,
    roleName: (match as any).roles?.name,
    email: userData.user.email ?? undefined,
  };
}
