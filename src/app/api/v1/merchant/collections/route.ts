import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET/POST /api/v1/merchant/collections
 *
 * Real backing for the "Receive Payment" (In-Store Instant Collection)
 * flow. Replaces ReceivePaymentModal's fake setTimeout simulation.
 *
 * POST creates a real merchant_payment_transactions row against the
 * selected branch's virtual NUBAN with status PENDING_PROVIDER_INTEGRATION
 * — no ledger money movement happens yet because there is no live
 * Providus webhook confirming the customer actually paid. The cashier
 * then manually confirms receipt via POST /collections/:id/confirm (same
 * honest "merchant-attested confirmation" pattern as invoice mark-paid),
 * which is the only path that posts the real ledger credit.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_payment_transactions')
    .select('id, reference, amount, fee, net_amount, currency, status, customer_name, customer_phone, narration, branch_id, created_at, settled_at')
    .eq('merchant_id', staff.merchantId)
    .in('status', ['PENDING_PROVIDER_INTEGRATION', 'PROCESSING'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse({ code: 'COLLECTIONS_LOOKUP_FAILED', message: 'Could not load pending collections.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ collections: data || [] }, { code: 'COLLECTIONS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
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
  const currency = String(body.currency || 'NGN').toUpperCase();
  const customerName = body.customerName ? String(body.customerName).trim() : null;
  const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : null;
  const narration = body.narration ? String(body.narration).trim() : null;
  const branchId = body.branchId && body.branchId !== 'ALL' ? body.branchId : null;
  const channel = body.channel ? String(body.channel).toUpperCase() : 'TRANSFER';

  if (!Number.isFinite(amount) || amount <= 0) {
    return createErrorResponse({ code: 'INVALID_AMOUNT', message: 'Enter a valid collection amount.', requestId: staff.requestId, httpStatus: 400 });
  }
  if (!['NGN', 'XOF', 'USD'].includes(currency)) {
    return createErrorResponse({ code: 'INVALID_CURRENCY', message: 'Unsupported currency.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  if (branchId) {
    const { data: branch } = await admin.from('merchant_branches').select('id').eq('id', branchId).eq('merchant_id', staff.merchantId).maybeSingle();
    if (!branch) {
      return createErrorResponse({ code: 'BRANCH_NOT_FOUND', message: 'Branch not found for this business.', requestId: staff.requestId, httpStatus: 404 });
    }
  }

  const fee = Math.round(amount * 0.015 * 100) / 100;
  const netAmount = amount - fee;
  const reference = `KP-COL-${new Date().getFullYear()}-${randomUUID().split('-')[0].toUpperCase()}`;
  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || reference;

  const { data, error } = await admin
    .from('merchant_payment_transactions')
    .insert({
      merchant_id: staff.merchantId,
      branch_id: branchId,
      reference,
      amount,
      fee,
      net_amount: netAmount,
      currency,
      payment_method: 'BANK_TRANSFER',
      channel,
      narration,
      status: 'PENDING_PROVIDER_INTEGRATION',
      customer_name: customerName,
      customer_phone: customerPhone,
      cashier_staff_id: staff.staffId,
      idempotency_key: idempotencyKey,
    })
    .select('id, reference, amount, fee, net_amount, currency, status, created_at')
    .single();

  if (error || !data) {
    const msg = error?.message || '';
    if (/duplicate key|unique/i.test(msg)) {
      const { data: existing } = await admin
        .from('merchant_payment_transactions')
        .select('id, reference, amount, fee, net_amount, currency, status, created_at')
        .eq('merchant_id', staff.merchantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        return createSuccessResponse(existing, { code: 'COLLECTION_ALREADY_CREATED', requestId: staff.requestId, environment: 'PRODUCTION' });
      }
    }
    return createErrorResponse({ code: 'COLLECTION_CREATE_FAILED', message: 'Could not create collection request.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: data.id,
      reference: data.reference,
      amount: Number(data.amount),
      fee: Number(data.fee),
      netAmount: Number(data.net_amount),
      currency: data.currency,
      status: data.status,
      createdAt: data.created_at,
    },
    {
      code: 'COLLECTION_CREATED',
      message: 'Collection request created. Confirm once the customer transfer lands and it will credit your settlement balance.',
      requestId: staff.requestId,
      environment: 'PRODUCTION',
      status: 201,
    },
  );
}
