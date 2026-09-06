import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { SupportRole } from '@/types/support';

export interface AuthenticatedSupportOfficer {
  officerId: string;
  orgId: string;
  authUserId: string;
  officerCode: string;
  fullName: string;
  email: string;
  role: SupportRole;
  tier: string;
  jurisdiction: 'NG' | 'NE' | 'CROSS_BORDER';
  languages: string[];
  status: 'ONLINE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';
  maxCapacity: number;
  qaScore: number;
  skills: string[];
  joinedDate: string;
  requestId: string;
}

export interface SupportOfficerAuthResult {
  isAuthenticated: boolean;
  officer?: AuthenticatedSupportOfficer;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
}

/**
 * Resolves the authenticated support officer for an incoming /api/support/*
 * request. Real authentication: validates the caller's Supabase access token
 * server-side, then resolves the matching public.support_officers row.
 *
 * This REPLACES the previous x-kp-support-officer header, which let the
 * browser assert any officer identity it liked — the server now decides who
 * is acting, from a verified session, exactly like agents and customers.
 */
export async function authenticateSupportOfficerRequest(
  request: NextRequest,
): Promise<SupportOfficerAuthResult> {
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
      errorMessage: 'Your session is invalid or has expired. Please sign in again.',
      httpStatus: 401,
    };
  }

  const authUserId = userData.user.id;

  const { data: officerRow, error: officerError } = await admin
    .from('support_officers')
    .select(
      'id, org_id, auth_user_id, officer_code, full_name, email, role, tier, jurisdiction, languages, status, max_capacity, qa_score, skills, joined_date',
    )
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (officerError) {
    return {
      isAuthenticated: false,
      errorCode: 'OFFICER_LOOKUP_FAILED',
      errorMessage: 'Could not resolve officer profile.',
      httpStatus: 500,
    };
  }

  if (!officerRow) {
    return {
      isAuthenticated: false,
      errorCode: 'OFFICER_NOT_FOUND',
      errorMessage: 'No support officer profile is associated with this account.',
      httpStatus: 403,
    };
  }

  return {
    isAuthenticated: true,
    officer: {
      officerId: officerRow.id,
      orgId: officerRow.org_id,
      authUserId: officerRow.auth_user_id,
      officerCode: officerRow.officer_code,
      fullName: officerRow.full_name,
      email: officerRow.email,
      role: officerRow.role as SupportRole,
      tier: officerRow.tier,
      jurisdiction: officerRow.jurisdiction,
      languages: officerRow.languages || [],
      status: officerRow.status,
      maxCapacity: officerRow.max_capacity,
      qaScore: Number(officerRow.qa_score ?? 0),
      skills: officerRow.skills || [],
      joinedDate: officerRow.joined_date ?? '',
      requestId,
    },
  };
}
