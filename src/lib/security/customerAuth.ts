import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface AuthenticatedCustomerContext {
  customerId: string;
  orgId: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: 'NG' | 'NE';
  kycTier: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
  status: 'ACTIVE' | 'SUSPENDED' | 'FROZEN' | 'DECEASED';
  preferredLanguage: 'en' | 'ha' | 'fr';
  requestId: string;
}

export interface CustomerAuthResult {
  isAuthenticated: boolean;
  customer?: AuthenticatedCustomerContext;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Resolves the authenticated customer for an incoming customer-portal API
 * request.
 *
 * This is REAL authentication, mirroring `authenticateAgentRequest`: it
 * validates the caller's Supabase access token (issued by
 * supabase.auth.signInWithPassword / getSession on the client) against
 * Supabase Auth itself via the admin client, then resolves the matching
 * public.customers row by `auth_user_id`. It does NOT accept a bare
 * well-formed string as proof of identity the way the legacy format-only
 * authMiddleware does, and it NEVER trusts a customerId/userId supplied by
 * the browser.
 *
 * A customer whose backend status is not ACTIVE is rejected outright — the
 * UI must never be able to transact on behalf of a SUSPENDED/FROZEN/DECEASED
 * customer no matter what the frontend believes.
 */
export async function authenticateCustomerRequest(request: NextRequest): Promise<CustomerAuthResult> {
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

  const { data: customerRow, error: customerError } = await admin
    .from('customers')
    .select('id, org_id, auth_user_id, first_name, last_name, email, phone, country, kyc_tier, status, preferred_language')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (customerError) {
    return {
      isAuthenticated: false,
      errorCode: 'CUSTOMER_LOOKUP_FAILED',
      errorMessage: 'Could not resolve customer profile.',
      httpStatus: 500,
    };
  }

  if (!customerRow) {
    return {
      isAuthenticated: false,
      errorCode: 'CUSTOMER_NOT_FOUND',
      errorMessage: 'No banking profile is associated with this account.',
      httpStatus: 403,
    };
  }

  if (customerRow.status !== 'ACTIVE') {
    return {
      isAuthenticated: false,
      errorCode: 'CUSTOMER_NOT_ACTIVE',
      errorMessage: `Your account is currently ${customerRow.status}. Please contact support.`,
      httpStatus: 403,
    };
  }

  return {
    isAuthenticated: true,
    customer: {
      customerId: customerRow.id,
      orgId: customerRow.org_id,
      authUserId: customerRow.auth_user_id,
      firstName: customerRow.first_name,
      lastName: customerRow.last_name,
      email: customerRow.email,
      phone: customerRow.phone,
      country: customerRow.country,
      kycTier: customerRow.kyc_tier,
      status: customerRow.status,
      preferredLanguage: customerRow.preferred_language,
      requestId,
    },
  };
}
