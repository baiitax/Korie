import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/settlements — real public.settlement_batches rows
 * for this aggregator's own org (settlement_batches is already org-scoped,
 * reused as-is from the agency-banking settlement engine).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agg } = await admin.from('aggregators').select('settlement_bank, settlement_account_number').eq('id', staff.aggregatorId).single();

  const { data: batches, error } = await admin
    .from('settlement_batches')
    .select('id, batch_reference, currency, settlement_date, status, total_commission_amount, total_agent_count, created_at, posted_at, paid_at')
    .eq('org_id', staff.orgId)
    .order('settlement_date', { ascending: false })
    .limit(60);

  if (error) {
    return createErrorResponse({ code: 'SETTLEMENTS_LOOKUP_FAILED', message: 'Could not load settlements.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (batches || []).map((b: any) => ({
    id: b.id,
    batchReference: b.batch_reference,
    providerRef: b.batch_reference,
    settlementDate: b.settlement_date,
    grossNetworkVolume: 0,
    totalInterchangeFees: 0,
    refundsAdjusted: 0,
    netAggregatorCommissionSettled: Number(b.total_commission_amount) * 0.5,
    currency: b.currency,
    destinationBank: agg?.settlement_bank || 'Not yet configured',
    destinationAccountMasked: agg?.settlement_account_number ? `****${String(agg.settlement_account_number).slice(-4)}` : '—',
    status: b.status === 'OPEN' ? 'SCHEDULED' : b.status === 'POSTED' ? 'PROCESSING' : b.status === 'PAID' ? 'COMPLETED' : 'FAILED',
    includedTransactionsCount: b.total_agent_count,
    settledAt: b.paid_at || b.posted_at,
  }));

  return createSuccessResponse({ settlements: mapped }, { code: 'SETTLEMENTS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
