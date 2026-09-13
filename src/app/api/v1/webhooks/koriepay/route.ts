import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/security/hmacSignature';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { OutboxService } from '@/lib/services/OutboxService';
import { AuditService } from '@/lib/services/AuditService';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimiter';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || `KP-WHK-${Date.now()}`;

  // This endpoint already fails closed on a missing/invalid HMAC signature
  // (below), but that check still costs a body read + constant-time
  // compare per request, and every rejected attempt still touches this
  // server. Without a floor here, a pure volumetric flood of garbage
  // requests (all correctly rejected on signature) can still burn CPU/
  // bandwidth. Throttle by IP before doing any real work.
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`inbound-webhook:${ip}`, 'WEBHOOK');
  if (!rateLimit.allowed) {
    return createErrorResponse({
      code: 'RATE_LIMITED',
      message: `Too many webhook requests. Try again in ${rateLimit.resetSeconds} seconds.`,
      requestId,
      httpStatus: 429,
    });
  }

  const signatureHeader = req.headers.get('x-koriepay-signature') || '';
  const rawBody = await req.text();

  // KORIEPAY_WEBHOOK_SECRET must be configured — there is no safe hardcoded
  // fallback for a signing secret. Without it, every request is rejected
  // rather than silently trusted (fail closed, not fail open).
  const secretKey = process.env.KORIEPAY_WEBHOOK_SECRET;
  if (!secretKey) {
    return createErrorResponse({
      code: 'WEBHOOK_NOT_CONFIGURED',
      message: 'Webhook signing secret is not configured on the server.',
      requestId,
      httpStatus: 503,
    });
  }

  const verification = verifyWebhookSignature(rawBody, signatureHeader, secretKey);
  if (!verification.isValid) {
    return createErrorResponse({
      code: 'INVALID_WEBHOOK_SIGNATURE',
      message: 'Webhook signature verification failed.',
      requestId,
      httpStatus: 401,
    });
  }

  let parsedPayload: any = {};
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch (err) {
    return createErrorResponse({
      code: 'INVALID_JSON_PAYLOAD',
      message: 'Webhook body could not be parsed as JSON.',
      requestId,
      httpStatus: 400,
    });
  }

  // Publish internal outbox domain event
  await OutboxService.publishEvent({
    orgId: parsedPayload.org_id || 'org_kor_99182',
    eventName: `webhook.received.${parsedPayload.event || 'generic'}`,
    aggregateType: 'WEBHOOK',
    aggregateId: parsedPayload.event_id || `EVT-${Date.now()}`,
    payload: parsedPayload,
  });

  return createSuccessResponse({
    received: true,
    event: parsedPayload.event,
    event_id: parsedPayload.event_id,
    processed_at: new Date().toISOString(),
  }, {
    code: 'WEBHOOK_ACKNOWLEDGED',
    message: 'Webhook received and queued for asynchronous processing.',
    requestId,
    environment: 'SANDBOX',
    status: 200,
  });
}
