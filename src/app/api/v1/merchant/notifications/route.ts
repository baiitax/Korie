import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 30), 1), 100);

  const { data, error } = await admin
    .from('merchant_notifications')
    .select('*')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return createErrorResponse({ code: 'NOTIFICATIONS_LOOKUP_FAILED', message: 'Could not load notifications.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ notifications: data || [] }, { code: 'NOTIFICATIONS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
