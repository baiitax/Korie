import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { quoteAgencyCommission } from '@/lib/agency/commissionPricing';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/cash-in
 *
 * Real, ledger-backed agent cash-in. Every successful call posts a balanced
 * double-entry transaction into public.ledger_transactions/ledger_entries via
 * the public.post_agency_cash_transaction() DB function, atomically:
 *   - debits the agent's WALLET_FLOAT ledger account
 *   - credits the agent's CASH_IN_HAND ledger account
 *   - persists a public.agency_transactions row
 *   - persists a public.agent_commissions row
 *
 * Idempotency: the caller MUST send an Idempotency-Key header. Replaying the
 * same key for the same agent returns the ORIGINAL transaction result rather
 * than creating a duplicate posting (verified server-side via a UNIQUE
 * constraint + idempotency check inside the DB function, not just a client
 * "disabled" flag).
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
      message: 'Enter a valid cash-in amount.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();

  // Authoritative commission/fee computation — never trust a client-supplied value.
  let quote;
  try {
    quote = await quoteAgencyCommission(admin, { transactionType: 'CASH_IN', currency: txCurrency, amount: parsedAmount });
  } catch (err: any) {
    return createErrorResponse({
      code: 'COMMISSION_QUOTE_FAILED',
      message: 'Could not price this transaction. Please try again.',
      requestId: agent.requestId,
      httpStatus: 500,
    });
  }

  const reference = `KP-${new Date().getFullYear()}-CSHIN-${randomUUID().split('-')[0].toUpperCase()}`;

  const { data, error } = await admin.rpc('post_agency_cash_transaction', {
    p_agent_id: agent.agentId,
    p_org_id: agent.orgId,
    p_transaction_type: 'CASH_IN',
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
    // Map known business-rule exceptions raised inside the DB function to
    // honest, specific error responses rather than a generic failure.
    const message = error.message || '';
    if (message.includes('INSUFFICIENT_WALLET_FLOAT')) {
      return createErrorResponse({
        code: 'INSUFFICIENT_WALLET_FLOAT',
        message: 'Insufficient wallet float balance. Please submit a float top-up request before continuing.',
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

    return createErrorResponse({
      code: 'CASH_IN_FAILED',
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
      code: 'CASH_IN_APPROVED',
      message: 'Agency cash-in authorized and posted to the ledger.',
      requestId: agent.requestId,
      environment: 'PRODUCTION',
    }
  );
}
