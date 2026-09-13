import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createErrorResponse } from '@/lib/security/apiResponse';

/** Least-privilege permission keys a Regional Manager may hold. Every
 *  /api/regional route declares the key it needs; anything not listed for
 *  the manager is denied server-side. Deliberately excludes admin.*,
 *  ledger.write, wallet.write, balance.adjust and transaction.override. */
export const REGIONAL_PERMISSIONS = [
  'regional.dashboard.view',
  'regional.aggregators.view',
  'regional.aggregators.performance.view',
  'regional.agents.view',
  'regional.customers.view_limited',
  'regional.merchants.view',
  'regional.transactions.view',
  'regional.liquidity.view',
  'regional.commissions.view',
  'regional.kyc.view',
  'regional.risk.view',
  'regional.support.manage',
  'regional.escalations.create',
  'regional.reports.view',
  'regional.reports.export',
  'regional.notifications.manage',
  'regional.search.use',
] as const;

export type RegionalPermission = (typeof REGIONAL_PERMISSIONS)[number];

export interface AuthenticatedRegionalManagerContext {
  managerId: string;
  authUserId: string;
  officerId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  country: 'NG' | 'NE';
  /** State/region names this manager supervises — the same vocabulary as
   *  agents.state_or_region and aggregator_territories.state_or_region. */
  territories: string[];
  permissions: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  requestId: string;
}

export interface RegionalManagerAuthResult {
  isAuthenticated: boolean;
  manager?: AuthenticatedRegionalManagerContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Resolves the authenticated Regional Manager for a Regional Portal API
 * request. Mirrors aggregatorAuth.ts: validate the caller's real Supabase
 * access token, resolve public.regional_manager_users by auth_user_id, and
 * refuse anything that is not an ACTIVE manager. Territory and permission
 * scope come from the database row — never from the request.
 */
export async function authenticateRegionalManagerRequest(
  request: NextRequest,
): Promise<RegionalManagerAuthResult> {
  const requestId =
    request.headers.get('x-request-id') ||
    `KP-REQ-${Date.now().toString(16)}-${Math.random().toString(36).slice(2, 6)}`;

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      errorCode: 'UNAUTHORIZED_MISSING_TOKEN',
      errorMessage: 'Missing Supabase session token. Please sign in again.',
      httpStatus: 401,
    };
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return {
      isAuthenticated: false,
      errorCode: 'UNAUTHORIZED_EMPTY_TOKEN',
      errorMessage: 'Empty session token.',
      httpStatus: 401,
    };
  }

  const admin = getSupabaseAdminClient();

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return {
      isAuthenticated: false,
      errorCode: 'UNAUTHORIZED_INVALID_SESSION',
      errorMessage: 'Invalid or expired session. Please sign in again.',
      httpStatus: 401,
    };
  }
  const authUserId = userData.user.id;

  const { data: manager, error: managerError } = await admin
    .from('regional_manager_users')
    .select('id, auth_user_id, full_name, email, phone, country, territories, permissions, status')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (managerError) {
    return {
      isAuthenticated: false,
      errorCode: 'BACKEND_ERROR',
      errorMessage: 'The regional manager registry could not be read.',
      httpStatus: 503,
    };
  }
  if (!manager) {
    return {
      isAuthenticated: false,
      errorCode: 'NOT_A_REGIONAL_MANAGER',
      errorMessage: 'This account is not a Regional Manager.',
      httpStatus: 403,
    };
  }
  if (manager.status !== 'ACTIVE') {
    return {
      isAuthenticated: false,
      errorCode: 'MANAGER_NOT_ACTIVE',
      errorMessage: `This regional manager account is ${manager.status}.`,
      httpStatus: 403,
    };
  }

  /* The support-desk row (cross-desk pattern) that escalation attribution
   * rides on — resolved here once, never from the client. */
  const { data: officer } = await admin
    .from('support_officers')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  // Record the real login (best-effort; never blocks the request).
  await admin
    .from('regional_manager_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', manager.id);

  return {
    isAuthenticated: true,
    manager: {
      managerId: manager.id,
      authUserId: manager.auth_user_id,
      officerId: officer?.id ?? null,
      fullName: manager.full_name,
      email: manager.email,
      phone: manager.phone ?? null,
      country: manager.country as 'NG' | 'NE',
      territories: Array.isArray(manager.territories) ? (manager.territories as string[]) : [],
      permissions: Array.isArray(manager.permissions) ? (manager.permissions as string[]) : [],
      status: manager.status,
      requestId,
    },
  };
}

export interface RegionalAuthorizedRequest {
  manager: AuthenticatedRegionalManagerContext;
}

/**
 * Centralized authorization for every regional route: authenticate, then
 * require the specific permission. One implementation — routes never
 * re-derive access rules. Returns either the manager context or a ready-to-
 * return error response.
 */
export async function authorizeRegionalRequest(
  request: NextRequest,
  permission: RegionalPermission,
): Promise<
  | { ok: true; manager: AuthenticatedRegionalManagerContext }
  | { ok: false; response: ReturnType<typeof createErrorResponse> }
> {
  const auth = await authenticateRegionalManagerRequest(request);
  if (!auth.isAuthenticated || !auth.manager) {
    return {
      ok: false,
      response: createErrorResponse({
        code: auth.errorCode || 'UNAUTHORIZED',
        message: auth.errorMessage || 'Not authorized.',
        requestId: `KP-REQ-${Date.now()}`,
        httpStatus: auth.httpStatus || 401,
      }),
    };
  }
  if (!auth.manager.permissions.includes(permission)) {
    return {
      ok: false,
      response: createErrorResponse({
        code: 'PERMISSION_DENIED',
        message: 'Your regional manager role does not include this capability.',
        requestId: `KP-REQ-${Date.now()}`,
        httpStatus: 403,
      }),
    };
  }
  return { ok: true, manager: auth.manager };
}
