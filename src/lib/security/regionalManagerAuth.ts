import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AuthenticatedRegionalManagerContext {
  managerId: string;
  authUserId: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: 'NG' | 'NE';
  /** State/region names this manager supervises — the same vocabulary as
   *  agents.state_or_region and aggregator_territories.state_or_region. */
  territories: string[];
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
 * request. Mirrors aggregatorAuth.ts exactly: validate the caller's real
 * Supabase access token, resolve public.regional_manager_users by
 * auth_user_id, and refuse anything that is not an ACTIVE manager.
 *
 * Every downstream query in the regional portal MUST scope by the returned
 * `territories` + `country` — the manager sees aggregators, agents and float
 * inside their territory and nothing else.
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
    .select('id, auth_user_id, full_name, email, phone, country, territories, status')
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
      fullName: manager.full_name,
      email: manager.email,
      phone: manager.phone ?? null,
      country: manager.country as 'NG' | 'NE',
      territories: Array.isArray(manager.territories) ? (manager.territories as string[]) : [],
      status: manager.status,
      requestId,
    },
  };
}
