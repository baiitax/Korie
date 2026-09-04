import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { TransactionService } from '@/lib/services/TransactionService';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['transfers:write']);
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

  const { destination_bank_code, destination_account_number, beneficiary_name, amount, reference, narration } = body;

  if (!destination_bank_code || !destination_account_number || !beneficiary_name || !amount || !reference) {
    return createErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'Missing required parameters for NIP outward dispatch.',
      requestId: context.requestId,
      httpStatus: 422,
    });
  }

  try {
    const tx = await TransactionService.executeNipOutward(context, {
      destinationBankCode: destination_bank_code,
      destinationAccountNumber: destination_account_number,
      beneficiaryName: beneficiary_name,
      amount: Number(amount),
      reference,
      narration,
    });

    return createSuccessResponse({
      reference: tx.reference,
      session_id: tx.metadata?.sessionId,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      provider: 'Providus Bank Nigeria (NIP)',
      provider_reference: tx.provider_reference,
      settled_at: tx.created_at,
    }, {
      message: 'NIP outward transfer dispatched successfully.',
      requestId: context.requestId,
      correlationId: context.correlationId,
      environment: context.environment,
    });
  } catch (err: any) {
    return createErrorResponse({
      code: 'NIP_DISPATCH_FAILED',
      message: err.message || 'NIP dispatch failed at bank node.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }
}
