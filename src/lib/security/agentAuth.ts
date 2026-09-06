import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AuthenticatedAgentContext {
  agentId: string;
  orgId: string;
  authUserId: string;
  agentCode: string;
  agentName: string;
  tier: 'TIER_1' | 'TIER_2' | 'SUPER_AGENT';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'DEACTIVATED';
  requestId: string;
}

export interface AgentAuthResult {
  isAuthenticated: boolean;
  agent?: AuthenticatedAgentContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Resolves the authenticated agent for an incoming agency-banking API request.
 *
 * This is REAL authentication: it validates the caller's Supabase access
 * token (issued by supabase.auth.signInWithPassword / getSession on the
 * client), looks up auth.users via the admin client, then resolves the
 * matching public.agents row. It does NOT accept a bare "well-formed string"
 * as proof of identity the way the legacy format-only authMiddleware does.
 *
 * Self-registered agents start life as `status: PENDING` (see
 * /api/auth/agent/register) — they can sign in and see their own dashboard
 * on HOLD immediately, but must not be able to move real cash or float until
 * an ops reviewer sets them ACTIVE. `requireActiveStatus` (default `true`)
 * is the enforcement point for that: every money-moving endpoint
 * (cash-in/cash-out/transfer) must keep the default, so a PENDING agent is
 * rejected outright there. Identity/read endpoints (me, float, kyc
 * documents, notifications, support tickets, transaction history) pass
 * `requireActiveStatus: false` so the agent can see their own hold status
 * and finish KYC while waiting for review.
 */
export async function authenticateAgentRequest(
  request: NextRequest,
  options: { requireActiveStatus?: boolean } = {},
): Promise<AgentAuthResult> {
  const requireActiveStatus = options.requireActiveStatus ?? true;
  const requestId = request.headers.get('x-request-id') || `KP-REQ-${Date.now().toString(16)}-${Math.random().toString(36).slice(2, 6)}`;

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

  // Validate the access token against Supabase Auth (this actually verifies
  // the JWT signature + expiry server-side; it is not a client-trusted claim).
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return {
      isAuthenticated: false,
      errorCode: 'UNAUTHORIZED_INVALID_SESSION',
      errorMessage: 'Your session is invalid or has expired. Please sign in again.',
      httpStatus: 401,
    };
  }

  const authUserId = userData.user.id;

  const { data: agentRow, error: agentError } = await admin
    .from('agents')
    .select('id, org_id, auth_user_id, agent_code, agent_name, tier, status')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (agentError) {
    return {
      isAuthenticated: false,
      errorCode: 'AGENT_LOOKUP_FAILED',
      errorMessage: 'Could not resolve agent profile.',
      httpStatus: 500,
    };
  }

  if (!agentRow) {
    return {
      isAuthenticated: false,
      errorCode: 'AGENT_NOT_FOUND',
      errorMessage: 'No agency banking profile is associated with this account.',
      httpStatus: 403,
    };
  }

  if (requireActiveStatus && agentRow.status !== 'ACTIVE') {
    return {
      isAuthenticated: false,
      errorCode: 'AGENT_NOT_ACTIVE',
      errorMessage:
        agentRow.status === 'PENDING'
          ? 'Your agent account is pending verification review. Transactions are disabled until an administrator approves your account.'
          : `Your agent account is currently ${agentRow.status}. Transactions are disabled until this is resolved.`,
      httpStatus: 403,
    };
  }

  return {
    isAuthenticated: true,
    agent: {
      agentId: agentRow.id,
      orgId: agentRow.org_id,
      authUserId: agentRow.auth_user_id,
      agentCode: agentRow.agent_code,
      agentName: agentRow.agent_name,
      tier: agentRow.tier,
      status: agentRow.status,
      requestId,
    },
  };
}
