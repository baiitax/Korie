import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface ComplianceAuthResult {
  isAuthorized: boolean;
  /** auth.users id (the Supabase session subject). */
  userId?: string;
  /** user_profiles.id — the id audit_events.actor_id is meant to carry. */
  profileId?: string;
  orgId?: string;
  roleName?: string;
  email?: string;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Compliance & Financial Crime Portal authorization.
 *
 * Mirrors adminAuth (src/lib/security/adminAuth.ts): the caller must present
 * a real Supabase access token, verified server-side; the officer's role is
 * resolved from public.organization_members — never from a client-asserted
 * string, and never from a hardcoded sandbox identity. The previous build
 * authenticated the whole portal with a mock bearer token and resolved
 * "who is operating" to a fixed in-memory user, which is exactly what this
 * gate replaces.
 */

export const COMPLIANCE_WRITE_ROLES = [
  'SUPER_ADMIN',
  'ORGANIZATION_OWNER',
  'ORGANIZATION_ADMIN',
  'COMPLIANCE_OFFICER',
] as const;

export const COMPLIANCE_READ_ROLES = [...COMPLIANCE_WRITE_ROLES, 'AGENCY_COMPLIANCE', 'FINANCE_OFFICER'] as const;

export async function authorizeComplianceRequest(
  request: NextRequest,
  allowedRoles: readonly string[] = COMPLIANCE_READ_ROLES,
): Promise<ComplianceAuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthorized: false,
      errorCode: 'UNAUTHORIZED_MISSING_TOKEN',
      errorMessage: 'Compliance session token missing. Please sign in.',
      httpStatus: 401,
    };
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return {
      isAuthorized: false,
      errorCode: 'UNAUTHORIZED_MISSING_TOKEN',
      errorMessage: 'Compliance session token missing. Please sign in.',
      httpStatus: 401,
    };
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return {
      isAuthorized: false,
      errorCode: 'COMPLIANCE_BACKEND_NOT_CONFIGURED',
      errorMessage: 'The compliance backend is not configured on this deployment (missing Supabase credentials).',
      httpStatus: 503,
    };
  }

  // Verify the token with Supabase Auth — a signed-in officer, nothing else.
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return {
      isAuthorized: false,
      errorCode: 'UNAUTHORIZED_INVALID_TOKEN',
      errorMessage: 'The compliance session is invalid or has expired. Please sign in again.',
      httpStatus: 401,
    };
  }

  const authUserId = userData.user.id;
  const email = userData.user.email ?? undefined;

  // Resolve the officer's profile, then their ACTIVE membership + role.
  // organization_members.user_id references user_profiles.id (same two-step
  // resolution as adminAuth).
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!profile) {
    return {
      isAuthorized: false,
      errorCode: 'PROFILE_NOT_FOUND',
      errorMessage: 'No user profile found for this account. Contact the platform owner.',
      httpStatus: 403,
    };
  }

  const { data: memberships, error: membershipError } = await admin
    .from('organization_members')
    .select('org_id, status, roles(name)')
    .eq('user_id', (profile as { id: string }).id)
    .eq('status', 'ACTIVE');

  if (membershipError) {
    return {
      isAuthorized: false,
      errorCode: 'COMPLIANCE_PROFILE_LOOKUP_FAILED',
      errorMessage: 'Could not resolve organizational membership. Please retry.',
      httpStatus: 503,
    };
  }

  const match = (memberships || []).find((m: any) => allowedRoles.includes(m.roles?.name));

  if (!match) {
    return {
      isAuthorized: false,
      errorCode: 'FORBIDDEN_ROLE',
      errorMessage: 'Your role does not have access to the compliance portal.',
      httpStatus: 403,
    };
  }

  return {
    isAuthorized: true,
    userId: authUserId,
    profileId: (profile as { id: string }).id,
    orgId: (match as any).org_id,
    roleName: (match as any).roles?.name,
    email,
  };
}

