import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/aggregator/settlements/run
 *
 * Triggers a real daily settlement run for this aggregator's own org via
 * the same run_daily_settlement() RPC agency-ops uses — idempotent per
 * (org, currency, date). Requires an ACTIVE aggregator organization.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const admin = getSupabaseAdminClient();
  const { data: agg } = await admin.from('aggregators').select('currency').eq('id', staff.aggregatorId).single();
  const currency = body.currency || agg?.currency || 'NGN';
  const settlementDate = body.settlementDate || new Date().toISOString().slice(0, 10);

  const { data: batch, error } = await admin.rpc('run_daily_settlement', {
    p_org_id: staff.orgId,
    p_currency: currency,
    p_settlement_date: settlementDate,
  });

  if (error) {
    return createErrorResponse({ code: 'SETTLEMENT_RUN_FAILED', message: 'Could not run settlement.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'SETTLEMENT_RUN',
    target_type: 'settlement_batches',
    target_id: batch.id,
    result: 'SUCCESS',
    reason: `Settlement run for ${currency} on ${settlementDate}.`,
  });

  return createSuccessResponse(
    { batchReference: batch.batch_reference, status: batch.status, totalCommissionAmount: Number(batch.total_commission_amount), totalAgentCount: batch.total_agent_count },
    { code: 'SETTLEMENT_RUN_COMPLETE', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
