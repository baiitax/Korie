import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { dispatchMerchantWebhookEvent } from '@/lib/merchant/webhookDispatch';

/**
 * POST /api/v1/merchant/invoices/:id/mark-paid
 *
 * Records that the merchant has manually confirmed payment for an invoice
 * (e.g. cash or a bank transfer they reconciled themselves) — an honest
 * merchant-attested record, not an automated payment confirmation from a
 * provider (no live virtual-account webhook integration exists yet).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateMerchantRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: inv, error: fetchError } = await admin
    .from('merchant_invoices')
    .select('id, status, total')
    .eq('id', params.id)
    .eq('merchant_id', staff.merchantId)
    .maybeSingle();

  if (fetchError || !inv) {
    return createErrorResponse({ code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  if (inv.status === 'PAID') {
    return createSuccessResponse({ id: inv.id, status: 'PAID' }, { code: 'INVOICE_ALREADY_PAID', requestId: staff.requestId, environment: 'PRODUCTION' });
  }
  if (inv.status === 'CANCELLED') {
    return createErrorResponse({ code: 'INVOICE_CANCELLED', message: 'A cancelled invoice cannot be marked paid.', requestId: staff.requestId, httpStatus: 409 });
  }

  const { data: updated, error: updateError } = await admin
    .from('merchant_invoices')
    .update({ status: 'PAID', paid_amount: inv.total, paid_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, status, paid_amount, paid_at')
    .single();

  if (updateError || !updated) {
    return createErrorResponse({ code: 'MARK_PAID_FAILED', message: 'Could not update invoice.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'INVOICE_MARKED_PAID',
    target_type: 'merchant_invoices',
    target_id: params.id,
    result: 'SUCCESS',
    reason: 'Merchant-attested manual payment confirmation.',
  });

  await dispatchMerchantWebhookEvent(admin, staff.merchantId, 'invoice.paid', {
    invoiceId: updated.id,
    paidAmount: Number(updated.paid_amount),
    paidAt: updated.paid_at,
  });

  return createSuccessResponse(
    { id: updated.id, status: updated.status, paidAmount: Number(updated.paid_amount), paidAt: updated.paid_at },
    { code: 'INVOICE_MARKED_PAID', requestId: staff.requestId, environment: 'PRODUCTION' }
  );
}
