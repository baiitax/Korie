import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
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
      message: 'Invalid JSON request payload.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }

  const { currency, wallet_tier, label } = body;

  const walletId = `wal_${(currency || 'ngn').toLowerCase()}_${Date.now().toString(36)}`;

  return createSuccessResponse({
    wallet_id: walletId,
    currency: currency || 'NGN',
    balance: 0,
    locked_balance: 0,
    available_balance: 0,
    tier: wallet_tier || 'TIER_1',
    label: label || 'Primary Ledger Wallet',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  }, {
    code: 'WALLET_PROVISIONED',
    message: 'Double-entry sub-ledger wallet created.',
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
    status: 201,
  });
}

export async function GET(req: NextRequest) {
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

  return createSuccessResponse([
    {
      wallet_id: 'wal_ngn_99182',
      currency: 'NGN',
      balance: 85000000,
      locked_balance: 500000,
      available_balance: 84500000,
      formatted_available: '₦845,000.00',
      status: 'ACTIVE',
    },
    {
      wallet_id: 'wal_xof_99183',
      currency: 'XOF',
      balance: 420000000,
      locked_balance: 0,
      available_balance: 420000000,
      formatted_available: '420,000 CFA',
      status: 'ACTIVE',
    },
  ], {
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
  });
}
