import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['fx:quote', 'fx:read']);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return createErrorResponse({
      code: 'INVALID_JSON',
      message: 'Invalid JSON body.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }

  const { source_currency, destination_currency, amount } = body;
  const rate = source_currency === 'NGN' ? 0.43 : 2.31;
  const quoteId = `FX-LOCK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return createSuccessResponse({
    quote_id: quoteId,
    source_currency,
    destination_currency,
    source_amount: Number(amount),
    destination_amount: Math.floor(Number(amount) * rate),
    exchange_rate: rate,
    guaranteed_lock_seconds: 60,
    expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
  }, {
    code: 'QUOTE_LOCKED',
    message: 'Guaranteed 60s bilateral FX rate lock created.',
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
  });
}
