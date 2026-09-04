import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { checkAndLockIdempotencyKey, commitIdempotencyKey } from '@/lib/security/idempotency';
import { checkRateLimit } from '@/lib/security/rateLimiter';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { TransactionService } from '@/lib/services/TransactionService';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req, ['transfers:write']);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized request',
      requestId: auth.context?.requestId || `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { context } = auth;

  // 1. Rate Limiting Check
  const rateLimit = checkRateLimit(context.apiKeyId || context.ipAddress, 'FINANCIAL');
  if (!rateLimit.allowed) {
    return createErrorResponse({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit quota exceeded. Please retry in ${rateLimit.resetSeconds} seconds.`,
      requestId: context.requestId,
      httpStatus: 429,
    });
  }

  // 2. Read Request Body
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return createErrorResponse({
      code: 'INVALID_JSON_BODY',
      message: 'Failed to parse JSON request body.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }

  // 3. Idempotency Check & Lock
  const idempotencyKey = context.idempotencyKey;
  if (idempotencyKey) {
    const idemCheck = await checkAndLockIdempotencyKey(
      idempotencyKey,
      context.orgId,
      '/v1/transfers/cross-border',
      body
    );

    if (idemCheck.isDuplicate) {
      if (idemCheck.status === 'COMMITTED' && idemCheck.cachedResponse) {
        return createSuccessResponse(idemCheck.cachedResponse.body, {
          requestId: context.requestId,
          correlationId: context.correlationId,
          environment: context.environment,
          idempotencyCached: true,
          status: idemCheck.cachedResponse.statusCode,
        });
      }

      return createErrorResponse({
        code: 'DUPLICATE_IDEMPOTENCY_KEY',
        message: idemCheck.error || 'A request with this Idempotency-Key is currently processing.',
        requestId: context.requestId,
        httpStatus: 409,
      });
    }
  }

  // 4. Validate Required Parameters
  const { source_currency, destination_currency, amount, reference, recipient, narration } = body;

  if (!source_currency || !destination_currency || !amount || !reference || !recipient?.account_number) {
    return createErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'Missing required parameters: source_currency, destination_currency, amount, reference, recipient.',
      requestId: context.requestId,
      httpStatus: 422,
    });
  }

  try {
    // 5. Execute Atomic Transfer & Double-Entry Ledger Posting
    const transaction = await TransactionService.executeCrossBorderTransfer(context, {
      sourceCurrency: source_currency,
      destinationCurrency: destination_currency,
      amount: Number(amount),
      reference,
      recipient: {
        name: recipient.name || 'Recipient Beneficiary',
        bankCode: recipient.bank_code || 'KORIS_NE',
        accountNumber: recipient.account_number,
        phone: recipient.phone,
      },
      narration,
    });

    const responseData = {
      transfer_reference: transaction.reference,
      status: transaction.status,
      source: {
        currency: transaction.source_currency,
        amount: transaction.amount,
        fee: transaction.fee,
        bank_node: 'Providus Bank Nigeria',
      },
      destination: {
        currency: transaction.destination_currency,
        amount: transaction.metadata?.destAmount,
        recipient_name: transaction.recipient_name,
        bank_node: transaction.recipient_bank,
        account_number: transaction.recipient_account,
      },
      exchange_rate: transaction.exchange_rate,
      provider_reference: transaction.provider_reference,
      settled_at: transaction.created_at,
    };

    // Commit Idempotency Key
    if (idempotencyKey) {
      await commitIdempotencyKey(idempotencyKey, context.orgId, 200, responseData);
    }

    return createSuccessResponse(responseData, {
      message: 'Bilateral cross-border transfer settled successfully.',
      code: 'TRANSFER_SUCCESSFUL',
      requestId: context.requestId,
      correlationId: context.correlationId,
      durationMs: Date.now() - context.startTime,
      environment: context.environment,
    });
  } catch (error: any) {
    return createErrorResponse({
      code: 'PROCESSING_ERROR',
      message: error.message || 'An unexpected error occurred during transfer settlement.',
      requestId: context.requestId,
      httpStatus: 400,
    });
  }
}
