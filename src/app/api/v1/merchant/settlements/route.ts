import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/merchant/settlements — real internal-ledger settlement batch
 * history (see run_daily_settlement-style batching to be added on top of
 * merchant_settlement_batches once real payment volume exists). Empty for
 * a freshly registered merchant — no fabricated settlement history.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_settlement_batches')
    .select('*')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'SETTLEMENTS_LOOKUP_FAILED', message: 'Could not load settlements.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((s: any) => ({
    id: s.id,
    batchReference: s.batch_reference,
    grossAmount: Number(s.gross_amount),
    totalFees: Number(s.total_fees),
    refundsDeducted: Number(s.refunds_deducted),
    netAmount: Number(s.net_amount),
    currency: s.currency,
    bankName: s.bank_name,
    accountNumber: s.account_number,
    status: s.status,
    transactionCount: s.transaction_count,
    settledAt: s.settled_at,
  }));

  return createSuccessResponse({ settlements: mapped }, { code: 'SETTLEMENTS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
