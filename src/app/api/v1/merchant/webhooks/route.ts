import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const ALLOWED_EVENTS = [
  'payment.successful', 'payment.failed', 'payment.refunded',
  'invoice.paid', 'settlement.completed', 'dispute.opened',
];

/**
 * GET/POST /api/v1/merchant/webhooks — real public.merchant_webhook_endpoints
 * CRUD. Replaces the MerchantContext dead `webhooks` state that had no
 * fetch function or backing route.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_webhook_endpoints')
    .select('id, url, events, status, success_rate, last_delivery_at, created_at')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'WEBHOOKS_LOOKUP_FAILED', message: 'Could not load webhooks.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((w: any) => ({
    id: w.id,
    url: w.url,
    events: w.events || [],
    status: w.status,
    successRate: w.success_rate !== null ? Number(w.success_rate) : null,
    lastDeliveryAt: w.last_delivery_at,
    createdAt: w.created_at,
  }));

  return createSuccessResponse({ webhooks: mapped }, { code: 'WEBHOOKS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
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

  const url = String(body.url || '').trim();
  const events: string[] = Array.isArray(body.events) ? body.events.filter((e: string) => ALLOWED_EVENTS.includes(e)) : [];

  if (!url || !/^https:\/\//.test(url)) {
    return createErrorResponse({ code: 'INVALID_URL', message: 'A valid HTTPS webhook URL is required.', requestId: staff.requestId, httpStatus: 400 });
  }
  if (events.length === 0) {
    return createErrorResponse({ code: 'MISSING_EVENTS', message: 'Select at least one event to subscribe to.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();
  const secret = `whsec_${randomBytes(24).toString('hex')}`;

  const { data, error } = await admin
    .from('merchant_webhook_endpoints')
    .insert({ merchant_id: staff.merchantId, url, events, secret_hash: secret })
    .select('id, url, events, status, created_at')
    .single();

  if (error || !data) {
    return createErrorResponse({ code: 'WEBHOOK_CREATE_FAILED', message: 'Could not create webhook endpoint.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { id: data.id, url: data.url, events: data.events, status: data.status, secret, createdAt: data.created_at },
    { code: 'WEBHOOK_CREATED', message: 'Store this signing secret now — it will not be shown again.', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 },
  );
}
