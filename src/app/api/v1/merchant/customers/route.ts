import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/merchant/customers — the merchant's own CRM record of who has
 * paid them. Real rows only; a freshly registered merchant sees an empty
 * list until real payment activity creates CRM entries.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_customers_crm')
    .select('*')
    .eq('merchant_id', staff.merchantId)
    .order('last_transaction_date', { ascending: false, nullsFirst: false });

  if (error) {
    return createErrorResponse({ code: 'CRM_LOOKUP_FAILED', message: 'Could not load customers.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((c: any) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    totalSpent: Number(c.total_spent),
    totalTransactionsCount: c.total_transactions_count,
    lastTransactionDate: c.last_transaction_date,
    status: c.status,
  }));

  return createSuccessResponse({ customers: mapped }, { code: 'CRM_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
