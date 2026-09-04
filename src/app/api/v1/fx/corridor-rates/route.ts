import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['fx:read']);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;

  return createSuccessResponse({
    corridor: 'NGN_XOF',
    timestamp: new Date().toISOString(),
    ngn_to_xof: {
      rate: 0.43,
      inverse: 2.3255,
      spread_bps: 18,
      market_status: 'OPEN',
      liquidity_pool: 'HIGH',
      central_bank_benchmark: 'BCEAO / CBN Parity',
    },
    xof_to_ngn: {
      rate: 2.31,
      inverse: 0.4329,
      spread_bps: 18,
      market_status: 'OPEN',
      liquidity_pool: 'HIGH',
      central_bank_benchmark: 'BCEAO / CBN Parity',
    },
  }, {
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
  });
}
