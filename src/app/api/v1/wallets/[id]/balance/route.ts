import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest(req, ['wallets:read']);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;
  const { id } = params;

  return createSuccessResponse({
    wallet_id: id,
    currency: id.includes('xof') ? 'XOF' : 'NGN',
    balance: 85000000,
    locked_balance: 500000,
    available_balance: 84500000,
    formatted_available: '₦845,000.00',
    ledger_account_reference: '2010-CUST-WALLETS-NGN',
    status: 'ACTIVE',
    updated_at: new Date().toISOString(),
  }, {
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
  });
}
