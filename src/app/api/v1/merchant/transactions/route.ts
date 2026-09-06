import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/merchant/transactions — the merchant's own real payment
 * collection history. Replaces the MERCHANT_PAYMENTS fixture.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 200);

  const { data, error } = await admin
    .from('merchant_payment_transactions')
    .select('id, reference, provider_reference, order_id, invoice_id, customer_name, customer_email, customer_phone, amount, fee, net_amount, currency, payment_method, channel, narration, status, branch_id, merchant_branches(branch_name), created_at, settled_at')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return createErrorResponse({ code: 'MERCHANT_TXNS_LOOKUP_FAILED', message: 'Could not load transactions.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((tx: any) => ({
    id: tx.id,
    reference: tx.reference,
    providerReference: tx.provider_reference,
    orderId: tx.order_id,
    invoiceId: tx.invoice_id,
    customerName: tx.customer_name,
    customerEmail: tx.customer_email,
    customerPhone: tx.customer_phone,
    amount: Number(tx.amount),
    fee: Number(tx.fee),
    netAmount: Number(tx.net_amount),
    currency: tx.currency,
    paymentMethod: tx.payment_method,
    channel: tx.channel,
    narration: tx.narration,
    status: tx.status,
    branchId: tx.branch_id,
    branchName: tx.merchant_branches?.branch_name || 'Main',
    createdAt: tx.created_at,
    settledAt: tx.settled_at,
  }));

  return createSuccessResponse({ transactions: mapped }, { code: 'MERCHANT_TXNS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
