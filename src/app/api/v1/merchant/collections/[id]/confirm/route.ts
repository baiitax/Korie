import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { dispatchMerchantWebhookEvent } from '@/lib/merchant/webhookDispatch';

/**
 * POST /api/v1/merchant/collections/:id/confirm
 *
 * The cashier/owner manually confirms an in-store collection was actually
 * received (they checked their bank alert/app) — this is the ONLY path
 * that posts the real ledger credit into the merchant's settlement
 * account, via public.confirm_merchant_collection(). Mirrors the invoice
 * mark-paid honest, merchant-attested pattern rather than an automated
 * provider webhook (none exists yet for merchant collections).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateMerchantRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin.rpc('confirm_merchant_collection', {
    p_transaction_id: params.id,
    p_merchant_id: staff.merchantId,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('COLLECTION_NOT_FOUND')) {
      return createErrorResponse({ code: 'COLLECTION_NOT_FOUND', message: 'Collection not found.', requestId: staff.requestId, httpStatus: 404 });
    }
    if (msg.includes('COLLECTION_NOT_CONFIRMABLE')) {
      return createErrorResponse({ code: 'COLLECTION_NOT_CONFIRMABLE', message: 'This collection can no longer be confirmed.', requestId: staff.requestId, httpStatus: 409 });
    }
    if (msg.includes('MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED')) {
      return createErrorResponse({ code: 'SETTLEMENT_ACCOUNT_MISSING', message: 'Settlement account not yet provisioned.', requestId: staff.requestId, httpStatus: 500 });
    }
    return createErrorResponse({ code: 'COLLECTION_CONFIRM_FAILED', message: 'Could not confirm collection.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'COLLECTION_CONFIRMED',
    target_type: 'merchant_payment_transactions',
    target_id: params.id,
    result: 'SUCCESS',
    reason: 'Merchant-attested confirmation that customer payment was received.',
  });

  await dispatchMerchantWebhookEvent(admin, staff.merchantId, 'payment.successful', {
    transactionId: data.id,
    reference: data.reference,
    amount: Number(data.amount),
    netAmount: Number(data.net_amount),
    currency: data.currency,
  });

  return createSuccessResponse(
    { id: data.id, status: data.status, netAmount: Number(data.net_amount), settledAt: data.settled_at },
    { code: 'COLLECTION_CONFIRMED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
