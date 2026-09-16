import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { submitMoneyMovement } from '@/lib/security/moneyMovement';

/**
 * POST /api/v1/merchant/settlements/run
 *
 * The MAKER step of the checked settlement flow (B8 / RISK-13, migration
 * 20260914000059) for merchants. This route no longer batches directly: it
 * submits a MERCHANT_SETTLEMENT_RUN request scoped to this merchant's OWN
 * profile (server-side identity — the merchant cannot be chosen by the
 * caller), and a DIFFERENT authorized officer must approve it before
 * run_merchant_settlement() executes inside the approval transaction.
 *
 * The eventual execution sweeps every SUCCESSFUL, not-yet-batched
 * transaction for this merchant into a new merchant_settlement_batches row
 * computed from real transaction sums (no invented gross/fee numbers), and
 * the settlement.completed webhook is dispatched from the decision surface
 * with the executed batch's real figures.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req);
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
  const currency = (body.currency || 'NGN').toString().toUpperCase();

  const submitted = await submitMoneyMovement({
    actionType: 'MERCHANT_SETTLEMENT_RUN',
    payload: {
      merchant_id: staff.merchantId,
      currency,
    },
    makerId: staff.staffId ?? null,
    makerEmail: staff.email,
    makerRole: 'MERCHANT_STAFF',
    makerNotes: `Settlement run requested by merchant staff (${staff.email})`,
  });

  if (!submitted.ok) {
    return createErrorResponse({ code: submitted.code, message: submitted.message, requestId: staff.requestId, httpStatus: submitted.httpStatus });
  }

  const admin = getSupabaseAdminClient();
  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
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
