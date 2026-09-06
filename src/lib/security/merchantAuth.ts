import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AuthenticatedMerchantStaffContext {
  staffId: string;
  merchantId: string;
  orgId: string;
  authUserId: string;
  fullName: string;
  email: string;
  role: 'MERCHANT_OWNER' | 'ADMIN' | 'FINANCE_MANAGER' | 'BRANCH_MANAGER' | 'CASHIER' | 'DEVELOPER' | 'AUDITOR';
  branchId: string | null;
  merchantStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'DEACTIVATED';
  kybStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  requestId: string;
}

export interface MerchantAuthResult {
  isAuthenticated: boolean;
  staff?: AuthenticatedMerchantStaffContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Resolves the authenticated merchant staff user for an incoming Merchant
 * Portal API request. Mirrors agentAuth.ts exactly: validates the caller's
 * real Supabase access token, resolves public.merchant_staff_users by
 * auth_user_id, then joins public.merchant_profiles for the business's real
 * status/kyb_status.
 *
 * A self-serve-registered merchant starts at merchant_profiles.status =
 * 'PENDING' — by default this is rejected for money-moving actions
 * (settlement payouts, invoice-to-real-payout, API key issuance for LIVE
 * environment) via `requireActiveStatus` (default true). Read/identity
 * endpoints (me, kyb documents, notifications) pass
 * `requireActiveStatus: false` so a PENDING merchant can see their own hold
 * status and finish KYB while waiting for review — same pattern as
 * agentAuth.ts's AGENT_NOT_ACTIVE handling.
 */
export async function authenticateMerchantRequest(
  request: NextRequest,
  options: { requireActiveStatus?: boolean } = {},
): Promise<MerchantAuthResult> {
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
    .from('merchant_staff_users')
    .select('id, merchant_id, auth_user_id, full_name, email, role, branch_id, status, merchant_profiles(org_id, status, kyb_status)')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (staffError) {
    return {
      isAuthenticated: false,
      errorCode: 'MERCHANT_STAFF_LOOKUP_FAILED',
      errorMessage: 'Could not resolve merchant staff profile.',
      httpStatus: 500,
    };
  }

  if (!staffRow) {
    return {
      isAuthenticated: false,
      errorCode: 'MERCHANT_STAFF_NOT_FOUND',
      errorMessage: 'No merchant business profile is associated with this account.',
      httpStatus: 403,
    };
  }

  if (staffRow.status !== 'ACTIVE') {
    return {
      isAuthenticated: false,
      errorCode: 'MERCHANT_STAFF_NOT_ACTIVE',
      errorMessage: `Your staff access is currently ${staffRow.status}.`,
      httpStatus: 403,
    };
  }

  const merchantProfile: any = Array.isArray(staffRow.merchant_profiles) ? staffRow.merchant_profiles[0] : staffRow.merchant_profiles;
  if (!merchantProfile) {
    return {
      isAuthenticated: false,
      errorCode: 'MERCHANT_PROFILE_NOT_FOUND',
      errorMessage: 'Merchant business profile could not be resolved.',
      httpStatus: 500,
    };
  }

  if (requireActiveStatus && merchantProfile.status !== 'ACTIVE') {
    return {
      isAuthenticated: false,
      errorCode: 'MERCHANT_NOT_ACTIVE',
      errorMessage:
        merchantProfile.status === 'PENDING'
          ? 'Your business account is pending verification review. This action is disabled until an administrator approves your account.'
          : `Your business account is currently ${merchantProfile.status}. This action is disabled until this is resolved.`,
      httpStatus: 403,
    };
  }

  return {
    isAuthenticated: true,
    staff: {
      staffId: staffRow.id,
      merchantId: staffRow.merchant_id,
      orgId: merchantProfile.org_id,
      authUserId,
      fullName: staffRow.full_name,
      email: staffRow.email,
      role: staffRow.role,
      branchId: staffRow.branch_id,
      merchantStatus: merchantProfile.status,
      kybStatus: merchantProfile.kyb_status,
      requestId,
    },
  };
}
