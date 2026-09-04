import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { ProvidusBankAdapter } from '@/lib/services/ProviderService';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['merchant:write']);
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

  const { customer_id, currency, bvn } = body;

  const virtualAcc = await ProvidusBankAdapter.generateDynamicVirtualAccount({
    reference: `CUST-${customer_id || Date.now()}`,
    customerName: 'Enterprise Client',
  });

  return createSuccessResponse({
    bank_name: 'Providus Bank',
    bank_code: '000023',
    account_number: virtualAcc.accountNumber,
    account_name: virtualAcc.accountName,
    currency: currency || 'NGN',
    status: 'ACTIVE',
    allocated_at: new Date().toISOString(),
  }, {
    message: 'Dedicated virtual NUBAN allocated.',
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
    status: 200,
  });
}
