import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { encryptWebhookSecret } from '@/lib/security/webhookSecretCrypto';
import { validateWebhookDestination } from '@/lib/security/ssrfGuard';
import { checkRateLimit } from '@/lib/security/rateLimiter';

// dispatchMerchantWebhookEvent (webhookDispatch.ts) fires a real outbound
// HTTP request to every ACTIVE endpoint on this merchant on every
// transaction event, with no fan-out cap. Without a ceiling here, an
// authenticated merchant could register an unbounded number of endpoints
// pointing at a single third-party target and turn KoriePay into an
// unwitting request-amplification/DDoS source, while also starving their
// own real integrations of dispatch capacity.
const MAX_WEBHOOK_ENDPOINTS_PER_MERCHANT = 10;

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

  // Per-merchant-account throttle on endpoint creation itself, independent
  // of the per-merchant endpoint count cap below — bounds how fast a
  // compromised or malicious session can attempt to reach that cap or
  // otherwise hammer this route.
  const creationRateLimit = checkRateLimit(`merchant-webhook-create:${staff.merchantId}`, 'DEFAULT', 20);
  if (!creationRateLimit.allowed) {
    return createErrorResponse({ code: 'RATE_LIMITED', message: `Too many webhook creation attempts. Try again in ${creationRateLimit.resetSeconds} seconds.`, requestId: staff.requestId, httpStatus: 429 });
  }

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

  // Defense-in-depth SSRF check at registration time (CWE-918): rejects
  // hostnames/IPs that are already obviously private/internal so a
  // merchant gets an immediate, clear error instead of every future
  // delivery to this endpoint silently failing the same check at dispatch
  // time. The dispatch-time check in ssrfGuard.safeFetch remains the real
  // enforcement point (DNS can change after registration), so this is a
  // convenience/early-feedback check, not a substitute for it.
  const destinationCheck = await validateWebhookDestination(url);
  if (!destinationCheck.ok) {
    return createErrorResponse({ code: 'INVALID_URL', message: destinationCheck.reason, requestId: staff.requestId, httpStatus: 400 });
  }

  if (events.length === 0) {
    return createErrorResponse({ code: 'MISSING_EVENTS', message: 'Select at least one event to subscribe to.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { count: existingCount, error: countError } = await admin
    .from('merchant_webhook_endpoints')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', staff.merchantId);

  if (countError) {
    return createErrorResponse({ code: 'WEBHOOK_CREATE_FAILED', message: 'Could not verify existing webhook endpoints.', requestId: staff.requestId, httpStatus: 500 });
  }
  if ((existingCount ?? 0) >= MAX_WEBHOOK_ENDPOINTS_PER_MERCHANT) {
    return createErrorResponse({
      code: 'WEBHOOK_LIMIT_REACHED',
      message: `You can register at most ${MAX_WEBHOOK_ENDPOINTS_PER_MERCHANT} webhook endpoints. Remove an existing endpoint before adding a new one.`,
      requestId: staff.requestId,
      httpStatus: 400,
    });
  }

  const secret = `whsec_${randomBytes(24).toString('hex')}`;

  // The raw secret is shown to the merchant exactly once in this response
  // (see the success message below) and never again — only its encrypted
  // form is persisted. It must be reversible (not hashed) because KoriePay
  // needs the plaintext back to compute the outgoing HMAC signature on
  // every webhook delivery; see webhookSecretCrypto.ts for why a one-way
  // hash (correct for merchant_api_keys.secret_key_hash) doesn't work here.
  const encryptedSecret = encryptWebhookSecret(secret);

  const { data, error } = await admin
    .from('merchant_webhook_endpoints')
    .insert({ merchant_id: staff.merchantId, url, events, secret_hash: encryptedSecret })
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
