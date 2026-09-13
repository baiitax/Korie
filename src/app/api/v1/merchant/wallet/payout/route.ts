import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/merchant/wallet/payout — this merchant's real payout request
 * history.
 *
 * POST /api/v1/merchant/wallet/payout — real on-demand payout request.
 * Honest pending-provider pattern: no live Providus payout rail exists
 * yet, so this locks the requested amount by debiting the merchant's real
 * settlement ledger balance into a PENDING_PROVIDER_INTEGRATION payout
 * request row — it never fabricates instant bank-delivered success.
 *
 * Calls public.request_merchant_payout(), which idempotency-short-circuits
 * on (merchant_id, idempotency_key) and locks the settlement ledger row
 * with SELECT...FOR UPDATE before checking the balance and posting the
 * debit — closing a check-then-act race where two concurrent requests (or
 * a client retry) could previously both read the same balance and both
 * succeed, letting a merchant withdraw more than they actually had.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_payout_requests')
    .select('id, amount, currency, destination_bank, destination_account, status, created_at, completed_at')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse({ code: 'PAYOUTS_LOOKUP_FAILED', message: 'Could not load payout requests.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ payouts: data || [] }, { code: 'PAYOUTS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return createErrorResponse({ code: 'INVALID_AMOUNT', message: 'Enter a valid payout amount.', requestId: staff.requestId, httpStatus: 400 });
  }

  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || null;

  const admin = getSupabaseAdminClient();

  const { data: payout, error } = await admin.rpc('request_merchant_payout', {
    p_merchant_id: staff.merchantId,
    p_requested_by: staff.staffId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
  });

  if (error || !payout) {
    const message = error?.message || '';
    if (message.includes('INSUFFICIENT_BALANCE')) {
      return createErrorResponse({ code: 'INSUFFICIENT_BALANCE', message: 'Payout amount exceeds your available settlement balance.', requestId: staff.requestId, httpStatus: 400 });
    }
    if (message.includes('MERCHANT_SETTLEMENT_ACCOUNT_NOT_PROVISIONED')) {
      return createErrorResponse({ code: 'SETTLEMENT_ACCOUNT_MISSING', message: 'Settlement account not yet provisioned.', requestId: staff.requestId, httpStatus: 500 });
    }
    if (message.includes('INVALID_AMOUNT')) {
      return createErrorResponse({ code: 'INVALID_AMOUNT', message: 'Enter a valid payout amount.', requestId: staff.requestId, httpStatus: 400 });
    }
    return createErrorResponse({ code: 'PAYOUT_CREATE_FAILED', message: 'Could not create payout request.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'PAYOUT_REQUESTED',
    target_type: 'merchant_payout_requests',
    target_id: payout.id,
    result: 'SUCCESS',
    reason: `Requested payout of ${amount} ${payout.currency}.`,
  });

  return createSuccessResponse(
    { id: payout.id, amount: Number(payout.amount), currency: payout.currency, status: payout.status, createdAt: payout.created_at },
    {
      code: 'PAYOUT_REQUESTED',
      message: 'Payout request created and pending bank rail integration — this will not move to your bank instantly.',
      requestId: staff.requestId,
      environment: 'PRODUCTION',
      status: 201,
    },
  );
}
