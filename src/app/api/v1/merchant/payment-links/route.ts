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
    .from('merchant_payment_links')
    .select('*')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'PAYMENT_LINKS_LOOKUP_FAILED', message: 'Could not load payment links.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((l: any) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    slug: l.slug,
    url: `https://pay.koriepay.com/m/${l.slug}`,
    type: l.link_type,
    amount: l.amount ? Number(l.amount) : undefined,
    currency: l.currency,
    status: l.status,
    totalPaymentsCount: l.total_payments_count,
    totalCollected: Number(l.total_collected),
    successfulPaymentsCount: l.successful_payments_count,
    redirectUrl: l.redirect_url,
    createdAt: l.created_at,
  }));

  return createSuccessResponse({ paymentLinks: mapped }, { code: 'PAYMENT_LINKS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

/**
 * POST — creates a real payment link row (no fee/collection is fabricated;
 * totals start at zero and only grow when a real checkout settles against
 * this link, once a real acquiring integration writes to
 * merchant_payment_transactions with a matching link reference). Allowed
 * while PENDING — this is business setup/configuration, not a live money
 * movement, so a merchant can finish onboarding their storefront while
 * awaiting KYB review.
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

  const { title, description, type, amount, redirectUrl } = body;
  if (!title || typeof title !== 'string') {
    return createErrorResponse({ code: 'VALIDATION_ERROR', message: 'title is required.', requestId: staff.requestId, httpStatus: 422 });
  }

  const { data: merchant } = await admin.from('merchant_profiles').select('currency').eq('id', staff.merchantId).single();
  const currency = merchant?.currency || 'NGN';

  const baseSlug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'link';
  const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

  const { data: link, error } = await admin
    .from('merchant_payment_links')
    .insert({
      merchant_id: staff.merchantId,
      title,
      description: description || null,
      slug,
      link_type: type || 'SINGLE',
      amount: amount ?? null,
      currency,
      redirect_url: redirectUrl || null,
      created_by: staff.staffId,
    })
    .select('*')
    .single();

  if (error || !link) {
    return createErrorResponse({ code: 'PAYMENT_LINK_CREATE_FAILED', message: 'Could not create payment link.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      id: link.id,
      title: link.title,
      description: link.description,
      slug: link.slug,
      url: `https://pay.koriepay.com/m/${link.slug}`,
      type: link.link_type,
      amount: link.amount ? Number(link.amount) : undefined,
      currency: link.currency,
      status: link.status,
      totalCollected: 0,
      successfulPaymentsCount: 0,
      createdAt: link.created_at,
    },
    { code: 'PAYMENT_LINK_CREATED', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 }
  );
}
