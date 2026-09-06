import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { dispatchMerchantWebhookEvent } from '@/lib/merchant/webhookDispatch';

/**
 * POST /api/v1/merchant/settlements/run
 *
 * Triggers a real settlement batch via public.run_merchant_settlement() —
 * sweeps every SUCCESSFUL, not-yet-batched transaction for this merchant
 * into a new merchant_settlement_batches row computed from real
 * transaction sums (no invented gross/fee numbers). This is the automated
 * workflow counterpart to the honest manual pending-provider payout flow:
 * it groups what has actually been collected, it does not itself move
 * money to a bank (see /wallet/payout for the payout-intent step).
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
  const currency = (body.currency || 'NGN').toUpperCase();

  const admin = getSupabaseAdminClient();

  const { data: batch, error } = await admin.rpc('run_merchant_settlement', {
    p_merchant_id: staff.merchantId,
    p_currency: currency,
  });

  if (error) {
    if ((error.message || '').includes('NO_TRANSACTIONS_TO_SETTLE')) {
      return createErrorResponse({ code: 'NO_TRANSACTIONS_TO_SETTLE', message: 'There are no newly settled transactions to batch right now.', requestId: staff.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: 'SETTLEMENT_RUN_FAILED', message: 'Could not run settlement.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'SETTLEMENT_RUN',
    target_type: 'merchant_settlement_batches',
    target_id: batch.id,
    result: 'SUCCESS',
    reason: `Settlement batch created for ${currency}: ${batch.transaction_count} transactions.`,
  });

  await dispatchMerchantWebhookEvent(admin, staff.merchantId, 'settlement.completed', {
    batchReference: batch.batch_reference,
    netAmount: Number(batch.net_amount),
    currency: batch.currency,
    transactionCount: batch.transaction_count,
  });

  return createSuccessResponse(
    {
      id: batch.id,
      batchReference: batch.batch_reference,
      grossAmount: Number(batch.gross_amount),
      totalFees: Number(batch.total_fees),
      netAmount: Number(batch.net_amount),
      currency: batch.currency,
      status: batch.status,
      transactionCount: batch.transaction_count,
    },
    { code: 'SETTLEMENT_RUN_COMPLETE', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
