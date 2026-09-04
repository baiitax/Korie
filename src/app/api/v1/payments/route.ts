import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { checkRateLimit } from '@/lib/security/rateLimiter';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { TransactionService } from '@/lib/services/TransactionService';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['payments:write']);
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
      message: 'Invalid JSON request payload.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }

  const { amount, currency, reference } = body;
  if (!amount || !currency || !reference) {
    return createErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'Missing required fields: amount, currency, reference.',
      requestId: context.requestId,
      httpStatus: 422,
    });
  }

  return createSuccessResponse({
    reference,
    amount: Number(amount),
    currency,
    status: 'PENDING',
    checkout_url: `https://pay.koriepay.com/checkout/${reference}`,
    created_at: new Date().toISOString(),
  }, {
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
    status: 201,
  });
}
