import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/security/hmacSignature';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { OutboxService } from '@/lib/services/OutboxService';
import { AuditService } from '@/lib/services/AuditService';

export async function POST(req: NextRequest) {
  const signatureHeader = req.headers.get('x-koriepay-signature') || '';
  const requestId = req.headers.get('x-request-id') || `KP-WHK-${Date.now()}`;
  const rawBody = await req.text();

  // Test secret for sandbox webhooks
  const secretKey = process.env.KORIEPAY_WEBHOOK_SECRET || 'whsec_test_secret_99281a0e';

  const verification = verifyWebhookSignature(rawBody, signatureHeader, secretKey);

  // If testing in sandbox, accept test pings gracefully
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
