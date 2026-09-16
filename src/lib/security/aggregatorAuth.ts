import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AuthenticatedAggregatorStaffContext {
  staffId: string;
  aggregatorId: string;
  orgId: string;
  authUserId: string;
  fullName: string;
  email: string;
  role:
    | 'AGGREGATOR_OWNER'
    | 'AGGREGATOR_ADMIN'
    | 'OPERATIONS_MANAGER'
    | 'FINANCE_MANAGER'
    | 'COMPLIANCE_OFFICER'
    | 'RISK_OFFICER'
    | 'FIELD_OFFICER'
    | 'AUDITOR'
    | 'ANALYST';
  territoryScope: string[];
  aggregatorStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVIEW';
  kybStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  requestId: string;
}

export interface AggregatorAuthResult {
  isAuthenticated: boolean;
  staff?: AuthenticatedAggregatorStaffContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Resolves the authenticated aggregator staff user for an incoming
 * Aggregator Portal API request. Mirrors merchantAuth.ts/agentAuth.ts
 * exactly: validates the caller's real Supabase access token, resolves
 * public.aggregator_staff_users by auth_user_id, then joins
 * public.aggregators for the aggregator organization's real status.
 *
 * A freshly seeded/registered aggregator starts at aggregators.status =
 * 'PENDING' — by default this is rejected for money-moving actions (float
 * dispatch, settlement runs, API key issuance for PRODUCTION) via
 * `requireActiveStatus` (default true). Read/identity endpoints (me,
 * notifications, team) pass `requireActiveStatus: false`.
 */
export async function authenticateAggregatorRequest(
  request: NextRequest,
  options: { requireActiveStatus?: boolean } = {},
): Promise<AggregatorAuthResult> {
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

  const { data: staffRow, error: staffError } = await admin
    .from('aggregator_staff_users')
    .select('id, aggregator_id, auth_user_id, full_name, email, role, territory_scope, status, aggregators(org_id, status, kyb_status)')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (staffError) {
    return {
      isAuthenticated: false,
      errorCode: 'AGGREGATOR_STAFF_LOOKUP_FAILED',
      errorMessage: 'Could not resolve aggregator staff profile.',
      httpStatus: 500,
    };
  }

  if (!staffRow) {
    return {
      isAuthenticated: false,
      errorCode: 'AGGREGATOR_STAFF_NOT_FOUND',
      errorMessage: 'No aggregator organization is associated with this account.',
      httpStatus: 403,
    };
  }

  if (staffRow.status !== 'ACTIVE') {
    return {
      isAuthenticated: false,
      errorCode: 'AGGREGATOR_STAFF_NOT_ACTIVE',
      errorMessage: `Your staff access is currently ${staffRow.status}.`,
      httpStatus: 403,
    };
  }

  const aggregatorRow: any = Array.isArray(staffRow.aggregators) ? staffRow.aggregators[0] : staffRow.aggregators;
  if (!aggregatorRow) {
    return {
      isAuthenticated: false,
      errorCode: 'AGGREGATOR_NOT_FOUND',
      errorMessage: 'Aggregator organization profile could not be resolved.',
      httpStatus: 500,
    };
  }

  if (requireActiveStatus && aggregatorRow.status !== 'ACTIVE') {
    return {
      isAuthenticated: false,
      errorCode: 'AGGREGATOR_NOT_ACTIVE',
      errorMessage:
        aggregatorRow.status === 'PENDING'
          ? 'Your aggregator account is pending verification review. This action is disabled until an administrator approves your account.'
          : `Your aggregator account is currently ${aggregatorRow.status}. This action is disabled until this is resolved.`,
      httpStatus: 403,
    };
  }

  // Phase B (F4) — optional, opt-in per-aggregator IP allowlist. Every
  // authenticated Aggregator Portal API request is checked here (the one
  // choke point every route already passes through), not just sign-in, so
  // a stolen session token is also useless from outside the allowed range.
  // is_ip_allowed_for_aggregator() itself returns TRUE (allowed) whenever
  // the aggregator has zero allowlist rows configured — the control never
  // silently locks anyone out by mere absence of configuration.
  const forwardedFor = request.headers.get('x-forwarded-for');
  const callerIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const { data: ipAllowed, error: ipCheckError } = await admin.rpc('is_ip_allowed_for_aggregator', {
    p_aggregator_id: staffRow.aggregator_id,
    p_ip: callerIp,
  });
  if (!ipCheckError && ipAllowed === false) {
    return {
      isAuthenticated: false,
      errorCode: 'IP_NOT_ALLOWLISTED',
      errorMessage: 'This request originates from an IP address that is not on your organization\'s allowlist. Contact your aggregator owner/admin to add it.',
      httpStatus: 403,
    };
  }

  return {
    isAuthenticated: true,
    staff: {
      staffId: staffRow.id,
      aggregatorId: staffRow.aggregator_id,
      orgId: aggregatorRow.org_id,
      authUserId,
      fullName: staffRow.full_name,
      email: staffRow.email,
      role: staffRow.role,
      territoryScope: staffRow.territory_scope || [],
      aggregatorStatus: aggregatorRow.status,
      kybStatus: aggregatorRow.kyb_status,
      requestId,
    },
  };
}
