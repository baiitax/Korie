import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { submitMoneyMovement } from '@/lib/security/moneyMovement';

/**
 * POST /api/v1/aggregator/settlements/run
 *
 * The MAKER step of the checked settlement flow (B8 / RISK-13, migration
 * 20260914000059) for aggregators. This route no longer runs the settlement
 * directly: it submits an AGENCY_SETTLEMENT_RUN request scoped to this
 * aggregator's OWN org (server-side identity — the org cannot be chosen by
 * the caller), and a DIFFERENT authorized officer must approve it before
 * run_daily_settlement() executes inside the approval transaction.
 *
 * The underlying function remains idempotent per (org, currency, date).
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
  const currency = (body.currency || agg?.currency || 'NGN').toString().toUpperCase();

  const submitted = await submitMoneyMovement({
    actionType: 'AGENCY_SETTLEMENT_RUN',
    payload: {
      org_id: staff.orgId,
      currency,
      ...(body.settlementDate ? { settlement_date: String(body.settlementDate) } : {}),
    },
    makerId: staff.staffId ?? null,
    makerEmail: staff.email,
    makerRole: 'AGGREGATOR_STAFF',
    makerNotes: `Settlement run requested by aggregator staff (${staff.email})`,
  });

  if (!submitted.ok) {
    return createErrorResponse({ code: submitted.code, message: submitted.message, requestId: staff.requestId, httpStatus: submitted.httpStatus });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'SETTLEMENT_RUN_SUBMITTED',
    target_type: 'maker_checker_requests',
    target_id: submitted.request?.id,
    result: 'SUCCESS',
    reason: `Checked settlement run submitted for ${currency}.`,
  });

  const rec = submitted.request;
  return createSuccessResponse(
    {
      request: {
        id: rec?.id,
        action_type: rec?.action_type,
        status: rec?.status,
        payload: rec?.payload,
        submitted_by: rec?.maker_email,
        submitted_at: rec?.created_at,
      },
      note: 'Settlement run submitted for checker approval. A different authorized officer must approve it before the batch posts.',
    },
    { code: 'SETTLEMENT_RUN_SUBMITTED_FOR_CHECKER_APPROVAL', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
