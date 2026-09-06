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

  const admin = getSupabaseAdminClient();

  const { data: merchant, error: merchantError } = await admin
    .from('merchant_profiles')
    .select('currency, settlement_bank, settlement_account_number, settlement_ledger_account_id, ledger_accounts(id, balance)')
    .eq('id', staff.merchantId)
    .single();

  if (merchantError || !merchant) {
    return createErrorResponse({ code: 'MERCHANT_LOOKUP_FAILED', message: 'Could not load business profile.', requestId: staff.requestId, httpStatus: 500 });
  }

  const ledgerRel: any = merchant.ledger_accounts;
  const ledgerAccount = Array.isArray(ledgerRel) ? ledgerRel[0] : ledgerRel;
  const availableBalance = Number(ledgerAccount?.balance ?? 0);

  if (!ledgerAccount) {
    return createErrorResponse({ code: 'SETTLEMENT_ACCOUNT_MISSING', message: 'Settlement account not yet provisioned.', requestId: staff.requestId, httpStatus: 500 });
  }

  if (amount > availableBalance) {
    return createErrorResponse({ code: 'INSUFFICIENT_BALANCE', message: `Payout amount exceeds your available balance of ${availableBalance}.`, requestId: staff.requestId, httpStatus: 400 });
  }

  // Lock the requested amount out of the available balance immediately so
  // the merchant cannot double-spend it while the payout is pending.
  const { error: debitError } = await admin
    .from('ledger_accounts')
    .update({ balance: availableBalance - amount, updated_at: new Date().toISOString() })
    .eq('id', ledgerAccount.id);

  if (debitError) {
    return createErrorResponse({ code: 'LEDGER_UPDATE_FAILED', message: 'Could not reserve payout amount.', requestId: staff.requestId, httpStatus: 500 });
  }

  const { data: payout, error } = await admin
    .from('merchant_payout_requests')
    .insert({
      merchant_id: staff.merchantId,
      requested_by: staff.staffId,
      amount,
      currency: merchant.currency,
      destination_bank: merchant.settlement_bank,
      destination_account: merchant.settlement_account_number,
      status: 'PENDING_PROVIDER_INTEGRATION',
    })
    .select()
    .single();

  if (error || !payout) {
    // Roll back the reservation if the request row could not be created.
    await admin.from('ledger_accounts').update({ balance: availableBalance, updated_at: new Date().toISOString() }).eq('id', ledgerAccount.id);
    return createErrorResponse({ code: 'PAYOUT_CREATE_FAILED', message: 'Could not create payout request.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'PAYOUT_REQUESTED',
    target_type: 'merchant_payout_requests',
    target_id: payout.id,
    result: 'SUCCESS',
    reason: `Requested payout of ${amount} ${merchant.currency}.`,
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
