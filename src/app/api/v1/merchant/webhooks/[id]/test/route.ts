import { NextRequest } from 'next/server';
import { createHmac, randomUUID } from 'crypto';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/merchant/webhooks/:id/test
 *
 * Real HTTP dispatch of a signed test event to the merchant's own webhook
 * URL — replaces the old "Send Test Webhook" button that only flipped
 * local UI state through a fake setTimeout with no network call. Every
 * attempt (success or failure) is recorded in
 * public.merchant_webhook_deliveries so delivery history is honest.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateMerchantRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: endpoint, error: fetchError } = await admin
    .from('merchant_webhook_endpoints')
    .select('id, url, secret_hash')
    .eq('id', params.id)
    .eq('merchant_id', staff.merchantId)
    .maybeSingle();

  if (fetchError || !endpoint) {
    return createErrorResponse({ code: 'WEBHOOK_NOT_FOUND', message: 'Webhook endpoint not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  const eventId = randomUUID();
  const payload = {
    event: 'ping.test',
    eventId,
    merchantId: staff.merchantId,
    sentAt: new Date().toISOString(),
    data: { message: 'This is a real test event dispatched from your KoriePay Merchant Portal.' },
  };
  const payloadBody = JSON.stringify(payload);
  const signature = createHmac('sha256', endpoint.secret_hash || 'unset').update(payloadBody).digest('hex');

  let status: 'DELIVERED' | 'FAILED' = 'FAILED';
  let responseCode: number | null = null;
  let errorMessage: string | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KoriePay-Signature': signature, 'X-KoriePay-Event': 'ping.test' },
      body: payloadBody,
      signal: AbortSignal.timeout(8000),
    });
    responseCode = res.status;
    status = res.ok ? 'DELIVERED' : 'FAILED';
    if (!res.ok) errorMessage = `Endpoint responded with HTTP ${res.status}.`;
  } catch (err: any) {
    errorMessage = err?.message || 'Could not reach the webhook URL.';
  }

  await admin.from('merchant_webhook_deliveries').insert({
    endpoint_id: endpoint.id,
    merchant_id: staff.merchantId,
    event_type: 'ping.test',
    payload,
    status,
    response_code: responseCode,
    error_message: errorMessage,
  });

  await admin
    .from('merchant_webhook_endpoints')
    .update({ last_delivery_at: new Date().toISOString(), status: status === 'DELIVERED' ? 'ACTIVE' : 'FAILING' })
    .eq('id', endpoint.id);

  if (status === 'DELIVERED') {
    return createSuccessResponse(
      { status, responseCode },
      { code: 'WEBHOOK_TEST_DELIVERED', message: `HTTP ${responseCode} received from your endpoint.`, requestId: staff.requestId, environment: 'PRODUCTION' },
    );
  }

  return createErrorResponse({
    code: 'WEBHOOK_TEST_FAILED',
    message: errorMessage || 'Webhook delivery failed.',
    requestId: staff.requestId,
    httpStatus: 502,
  });
}
