import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { LedgerService } from '@/lib/services/LedgerService';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest(req, ['wallets:write']);
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

  const { amount, currency, reason, reference, ttl_minutes } = body;

  try {
    const hold = await LedgerService.placeHold({
      walletId: params.id,
      accountId: 'acc_liab_customer_wallets_ngn',
      amount: Number(amount),
      currency: currency || 'NGN',
      reason: reason || 'Escrow Reservation',
      reference: reference || `HOLD-${Date.now()}`,
      ttlMinutes: ttl_minutes,
    });

    return createSuccessResponse(hold, {
      code: 'HOLD_PLACED',
      message: 'Escrow hold locked on wallet.',
      requestId: context.requestId,
      correlationId: context.correlationId,
      environment: context.environment,
    });
  } catch (err: any) {
    return createErrorResponse({
      code: 'HOLD_FAILED',
      message: err.message || 'Failed to lock balance hold.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }
}
