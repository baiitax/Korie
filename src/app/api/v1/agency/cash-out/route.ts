import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { quoteAgencyCommission } from '@/lib/agency/commissionPricing';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/cash-out
 *
 * Real, ledger-backed agent cash-out. Mirrors /cash-in but in reverse:
 *   - debits the agent's CASH_IN_HAND ledger account (physical cash leaves the agent)
 *   - credits the agent's WALLET_FLOAT ledger account
 *
 * Same idempotency + authoritative commission-quote guarantees as cash-in.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { agent } = auth;

  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return createErrorResponse({
      code: 'MISSING_IDEMPOTENCY_KEY',
      message: 'An Idempotency-Key header is required for financial mutations.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({
      code: 'INVALID_JSON',
      message: 'Invalid JSON body.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  const { customer_name, customer_account, customer_bank, customer_phone, amount, currency } = body;

  const parsedAmount = Number(amount);
  const txCurrency = (currency || 'NGN') as 'NGN' | 'XOF';

  if (!customer_name || !customer_account || !customer_bank) {
    return createErrorResponse({
      code: 'MISSING_CUSTOMER_DETAILS',
      message: 'Customer name, account number and bank are required.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  if (!parsedAmount || parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
    return createErrorResponse({
      code: 'INVALID_AMOUNT',
      message: 'Enter a valid cash-out amount.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();

  let quote;
  try {
    quote = await quoteAgencyCommission(admin, { transactionType: 'CASH_OUT', currency: txCurrency, amount: parsedAmount });
  } catch {
    return createErrorResponse({
      code: 'COMMISSION_QUOTE_FAILED',
      message: 'Could not price this transaction. Please try again.',
      requestId: agent.requestId,
      httpStatus: 500,
    });
  }

  const reference = `KP-${new Date().getFullYear()}-CSHOUT-${randomUUID().split('-')[0].toUpperCase()}`;

  const { data, error } = await admin.rpc('post_agency_cash_transaction', {
    p_agent_id: agent.agentId,
    p_org_id: agent.orgId,
    p_transaction_type: 'CASH_OUT',
    p_amount: parsedAmount,
    p_currency: txCurrency,
    p_customer_fee: quote.customerFee,
    p_agent_commission: quote.agentCommission,
    p_customer_name: customer_name,
    p_customer_phone: customer_phone || null,
    p_customer_account: customer_account,
    p_customer_bank: customer_bank,
    p_idempotency_key: idempotencyKey,
    p_reference: reference,
  });

  if (error) {
    const message = error.message || '';
    if (message.includes('INSUFFICIENT_CASH_IN_HAND')) {
      return createErrorResponse({
        code: 'INSUFFICIENT_CASH_IN_HAND',
        message: 'Insufficient physical cash in hand to complete this withdrawal.',
        requestId: agent.requestId,
        httpStatus: 422,
      });
    }
    if (message.includes('AGENT_FLOAT_NOT_PROVISIONED')) {
      return createErrorResponse({
        code: 'AGENT_FLOAT_NOT_PROVISIONED',
        message: 'Your agent float account has not been provisioned yet. Contact support.',
        requestId: agent.requestId,
        httpStatus: 409,
      });
    }
    if (message.includes('SINGLE_TRANSACTION_LIMIT_EXCEEDED')) {
      return createErrorResponse({
        code: 'SINGLE_TRANSACTION_LIMIT_EXCEEDED',
        message: 'This amount exceeds your single-transaction limit.',
        requestId: agent.requestId,
        httpStatus: 422,
      });
    }
    if (message.includes('DAILY_CASH_LIMIT_EXCEEDED')) {
      return createErrorResponse({
        code: 'DAILY_CASH_LIMIT_EXCEEDED',
        message: 'This transaction would exceed your daily cash limit.',
        requestId: agent.requestId,
        httpStatus: 422,
      });
    }

    return createErrorResponse({
      code: 'CASH_OUT_FAILED',
      message: 'We could not confirm the transaction status yet. Please do not retry immediately — check transaction history first.',
      requestId: agent.requestId,
      httpStatus: 502,
    });
  }

  const tx = data;

  return createSuccessResponse(
    {
      id: tx.id,
      reference: tx.reference,
      ledger_transaction_id: tx.ledger_transaction_id,
      type: tx.transaction_type,
      amount: Number(tx.amount),
      customer_fee: Number(tx.customer_fee),
      agent_commission: Number(tx.agent_commission),
      currency: tx.currency,
      status: tx.status,
      customer_name: tx.customer_name,
      customer_phone: tx.customer_phone,
      customer_account: tx.customer_account,
      customer_bank: tx.customer_bank,
      created_at: tx.created_at,
      completed_at: tx.completed_at,
    },
    {
      code: 'CASH_OUT_APPROVED',
      message: 'Agency cash-out authorized and posted to the ledger.',
      requestId: agent.requestId,
      environment: 'PRODUCTION',
    }
  );
}
