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

  const { data, error } = await admin
    .from('merchant_disputes')
    .select('*')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'DISPUTES_LOOKUP_FAILED', message: 'Could not load disputes.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((d: any) => ({
    id: d.id,
    disputeReference: d.dispute_reference,
    customerName: d.customer_name,
    amount: Number(d.amount),
    currency: d.currency,
    reason: d.reason,
    status: d.status,
    evidenceDeadline: d.evidence_deadline,
    resolvedAt: d.resolved_at,
    createdAt: d.created_at,
  }));

  return createSuccessResponse({ disputes: mapped }, { code: 'DISPUTES_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
