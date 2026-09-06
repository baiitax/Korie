import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_invoices')
    .select('*')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'INVOICES_LOOKUP_FAILED', message: 'Could not load invoices.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    customerName: inv.customer_name,
    customerEmail: inv.customer_email,
    customerPhone: inv.customer_phone,
    customerAddress: inv.customer_address,
    items: inv.line_items || [],
    subtotal: Number(inv.subtotal),
    tax: Number(inv.tax),
    discount: Number(inv.discount),
    total: Number(inv.total),
    currency: inv.currency,
    status: inv.status,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    virtualAccountNuban: inv.virtual_account_nuban,
    virtualAccountBank: inv.virtual_account_bank,
    notes: inv.notes,
    paidAmount: Number(inv.paid_amount),
    paidAt: inv.paid_at,
    createdAt: inv.created_at,
  }));

  return createSuccessResponse({ invoices: mapped }, { code: 'INVOICES_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

/**
 * POST — creates a real DRAFT/SENT invoice row. No virtual account number
 * is fabricated here: virtual_account_* stays null until a real dynamic
 * virtual account provider integration exists (see ProviderService.ts
 * pattern used by /api/v1/merchant/checkout for the sandbox-only NIBSS
 * simulator; a genuine per-invoice NUBAN would be wired the same way once
 * live provider credentials exist).
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const { customerName, customerEmail, customerPhone, customerAddress, items, subtotal, tax, discount, total, dueDate, notes } = body;
  if (!customerName || !dueDate || !Array.isArray(items) || items.length === 0) {
    return createErrorResponse({ code: 'VALIDATION_ERROR', message: 'customerName, dueDate and at least one line item are required.', requestId: staff.requestId, httpStatus: 422 });
  }

  const { data: merchant } = await admin.from('merchant_profiles').select('currency').eq('id', staff.merchantId).single();
  const currency = merchant?.currency || 'NGN';

  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: inv, error } = await admin
    .from('merchant_invoices')
    .insert({
      merchant_id: staff.merchantId,
      invoice_number: invoiceNumber,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      line_items: items,
      subtotal: subtotal || 0,
      tax: tax || 0,
      discount: discount || 0,
      total: total || 0,
      currency,
      status: 'SENT',
      due_date: dueDate,
      notes: notes || null,
      created_by: staff.staffId,
    })
    .select('*')
    .single();

  if (error || !inv) {
    return createErrorResponse({ code: 'INVOICE_CREATE_FAILED', message: 'Could not create invoice.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: inv.customer_name,
      items: inv.line_items,
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      discount: Number(inv.discount),
      total: Number(inv.total),
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.due_date,
      notes: inv.notes,
      createdAt: inv.created_at,
    },
    { code: 'INVOICE_CREATED', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 }
  );
}
