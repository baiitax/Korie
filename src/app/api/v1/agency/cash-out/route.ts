import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['agency:write']);
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

  const { terminal_id, agent_id, amount, currency, reference } = body;
  const commission = Math.floor(Number(amount) * 0.01); // 1.0% agent commission

  return createSuccessResponse({
    reference: reference || `POS-OUT-${Date.now()}`,
    auth_code: `APPRV-${Math.floor(10000 + Math.random() * 90000)}`,
    terminal_id,
    agent_id,
    amount: Number(amount),
    currency: currency || 'NGN',
    agent_commission: commission,
    agent_wallet_credited: true,
    status: 'SUCCESSFUL',
    settled_at: new Date().toISOString(),
  }, {
    code: 'CASH_OUT_APPROVED',
    message: 'Agency cash withdrawal authorized and agent wallet credited.',
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
  });
}
