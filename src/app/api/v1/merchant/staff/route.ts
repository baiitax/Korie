import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/merchant/staff — the real team roster (owner + any invited
 * staff). Replaces the MERCHANT_STAFF fixture.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_staff_users')
    .select('id, full_name, email, phone, role, branch_id, merchant_branches(branch_name), status, last_login_at')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'STAFF_LOOKUP_FAILED', message: 'Could not load staff.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((s: any) => ({
    id: s.id,
    fullName: s.full_name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    branchId: s.branch_id,
    branchName: s.merchant_branches?.branch_name,
    status: s.status,
    lastLoginAt: s.last_login_at,
  }));

  return createSuccessResponse({ staff: mapped }, { code: 'STAFF_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
