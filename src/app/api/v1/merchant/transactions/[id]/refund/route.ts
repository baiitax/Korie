import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { dispatchMerchantWebhookEvent } from '@/lib/merchant/webhookDispatch';

/**
 * POST /api/v1/merchant/transactions/:id/refund
 *
 * Marks a real transaction REFUNDED. Honest scope: this records the
 * merchant's intent and an audit trail; it does not itself trigger a live
 * bank/card refund since no acquiring/PSP payout integration exists yet
 * (same "no fake provider success" boundary as agency/customer transfers).
 * A transaction can only be refunded if it previously settled
 * (SUCCESSFUL) — refunding a still-pending collection is rejected.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateMerchantRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const reason = body.reason || 'Merchant-initiated refund';

  const admin = getSupabaseAdminClient();

  const { data: tx, error: fetchError } = await admin
    .from('merchant_payment_transactions')
    .select('id, status, narration')
    .eq('id', params.id)
    .eq('merchant_id', staff.merchantId)
    .maybeSingle();

  if (fetchError || !tx) {
    return createErrorResponse({ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  if (tx.status !== 'SUCCESSFUL') {
    return createErrorResponse({ code: 'REFUND_NOT_ELIGIBLE', message: `Only SUCCESSFUL transactions can be refunded (current status: ${tx.status}).`, requestId: staff.requestId, httpStatus: 409 });
  }

  const { data: updated, error: updateError } = await admin
    .from('merchant_payment_transactions')
    .update({ status: 'REFUNDED', narration: `Refunded: ${reason}` })
    .eq('id', params.id)
    .select('id, status, narration')
    .single();

  if (updateError || !updated) {
    return createErrorResponse({ code: 'REFUND_FAILED', message: 'Could not process refund.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'TRANSACTION_REFUNDED',
    target_type: 'merchant_payment_transactions',
    target_id: params.id,
    result: 'SUCCESS',
    reason,
  });

  await dispatchMerchantWebhookEvent(admin, staff.merchantId, 'payment.refunded', {
    transactionId: updated.id,
    status: updated.status,
    reason,
  });

  return createSuccessResponse({ id: updated.id, status: updated.status }, { code: 'TRANSACTION_REFUNDED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
