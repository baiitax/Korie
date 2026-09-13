import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/security/hmacSignature';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { OutboxService } from '@/lib/services/OutboxService';
import { AuditService } from '@/lib/services/AuditService';

export async function POST(req: NextRequest) {
  const signatureHeader = req.headers.get('x-koriepay-signature') || '';
  const requestId = req.headers.get('x-request-id') || `KP-WHK-${Date.now()}`;
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
