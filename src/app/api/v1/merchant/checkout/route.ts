import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { ProvidusBankAdapter } from '@/lib/services/ProviderService';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['checkout:create', 'payments:write']);
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

  const { amount, currency, reference, customer_name, customer_email } = body;

  if (!amount || !currency || !reference) {
    return createErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'Missing required parameters: amount, currency, reference.',
      requestId: context.requestId,
      httpStatus: 422,
    });
  }

  const virtualAcc = await ProvidusBankAdapter.generateDynamicVirtualAccount({
    reference,
    customerName: customer_name || 'Retail Customer',
    amount: Number(amount),
  });

  return createSuccessResponse({
    reference,
    amount: Number(amount),
    currency,
    checkout_url: `https://pay.koriepay.com/checkout/${reference}`,
    virtual_account: {
      bank_name: virtualAcc.bankName,
      bank_code: virtualAcc.bankCode,
      account_number: virtualAcc.accountNumber,
      account_name: virtualAcc.accountName,
      expires_at: virtualAcc.expiresAt,
    },
    qr_code_data: `koriepay://pay?ref=${reference}&acc=${virtualAcc.accountNumber}&amt=${amount}`,
  }, {
    code: 'CHECKOUT_INITIALIZED',
    message: 'Dynamic checkout session generated successfully.',
    requestId: context.requestId,
    correlationId: context.correlationId,
    environment: context.environment,
    status: 201,
  });
}
