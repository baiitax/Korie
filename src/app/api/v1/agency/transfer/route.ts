import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { quoteAgencyCommission } from '@/lib/agency/commissionPricing';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/transfer
 *
 * Real, ledger-backed outbound agent transfer (NIP domestic or cross-border
 * NG<->NE). The agent's wallet float is debited for real, immediately and
 * finally, via public.post_agency_transfer(). The RECEIVING bank leg is
 * honestly represented as PENDING_PROVIDER_INTEGRATION — there is no live
 * Providus Bank Nigeria / Coris Bank Niger payout integration wired up yet,
 * so this endpoint never claims the transfer has reached the recipient.
 * The frontend must render this state as "processing" and MUST NOT show a
 * green/success confirmation for it.
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
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { recipient_name, recipient_account, recipient_bank, recipient_bank_code, amount, currency, transfer_type } = body;
  const parsedAmount = Number(amount);
  const txCurrency = (currency || 'NGN') as 'NGN' | 'XOF';
  const txType = transfer_type === 'TRANSFER_CROSS_BORDER' ? 'TRANSFER_CROSS_BORDER' : 'TRANSFER_NIP';

  // Currency integrity: cross-border transfers must be XOF-out from an NGN
  // agent context is out of scope here — this route only ever moves a
  // single currency end-to-end; it never mixes NGN and XOF in one posting.
  if (txType === 'TRANSFER_NIP' && txCurrency !== 'NGN') {
    return createErrorResponse({
      code: 'CURRENCY_MISMATCH',
      message: 'Domestic NIP transfers must be in NGN.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  if (!recipient_name || !recipient_account || !recipient_bank) {
    return createErrorResponse({
      code: 'MISSING_RECIPIENT_DETAILS',
      message: 'Recipient name, account number and bank are required.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  if (!parsedAmount || parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
    return createErrorResponse({ code: 'INVALID_AMOUNT', message: 'Enter a valid transfer amount.', requestId: agent.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  let quote;
  try {
    quote = await quoteAgencyCommission(admin, { transactionType: txType, currency: txCurrency, amount: parsedAmount });
  } catch {
    return createErrorResponse({ code: 'COMMISSION_QUOTE_FAILED', message: 'Could not price this transfer.', requestId: agent.requestId, httpStatus: 500 });
  }

  const reference = `KP-${new Date().getFullYear()}-XFER-${randomUUID().split('-')[0].toUpperCase()}`;

  const { data, error } = await admin.rpc('post_agency_transfer', {
    p_agent_id: agent.agentId,
    p_org_id: agent.orgId,
    p_transaction_type: txType,
    p_amount: parsedAmount,
    p_currency: txCurrency,
    p_customer_fee: quote.customerFee,
    p_agent_commission: quote.agentCommission,
    p_recipient_name: recipient_name,
    p_recipient_account: recipient_account,
    p_recipient_bank: recipient_bank,
    p_recipient_bank_code: recipient_bank_code || null,
    p_idempotency_key: idempotencyKey,
    p_reference: reference,
  });

  if (error) {
    const message = error.message || '';
    if (message.includes('INSUFFICIENT_WALLET_FLOAT')) {
      return createErrorResponse({ code: 'INSUFFICIENT_WALLET_FLOAT', message: 'Insufficient wallet float to cover this transfer and fee.', requestId: agent.requestId, httpStatus: 422 });
    }
    if (message.includes('SINGLE_TRANSACTION_LIMIT_EXCEEDED')) {
      return createErrorResponse({ code: 'SINGLE_TRANSACTION_LIMIT_EXCEEDED', message: 'This amount exceeds your single-transaction limit.', requestId: agent.requestId, httpStatus: 422 });
    }
    if (message.includes('DAILY_CASH_LIMIT_EXCEEDED')) {
      return createErrorResponse({ code: 'DAILY_CASH_LIMIT_EXCEEDED', message: 'This transfer would exceed your daily transaction limit.', requestId: agent.requestId, httpStatus: 422 });
    }
    if (message.includes('CLEARING_ACCOUNT_NOT_CONFIGURED')) {
      return createErrorResponse({ code: 'CLEARING_ACCOUNT_NOT_CONFIGURED', message: 'Outbound transfer rail is not configured for this currency yet.', requestId: agent.requestId, httpStatus: 409 });
    }
    if (message.includes('AGENT_FLOAT_NOT_PROVISIONED')) {
      return createErrorResponse({ code: 'AGENT_FLOAT_NOT_PROVISIONED', message: 'Your agent float account has not been provisioned yet. Contact support.', requestId: agent.requestId, httpStatus: 409 });
    }

    return createErrorResponse({
      code: 'TRANSFER_FAILED',
      message: 'We could not confirm the transfer status yet. Please do not retry immediately — check transaction history first.',
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
      status: tx.status, // PENDING_PROVIDER_INTEGRATION — never SUCCESSFUL here
      provider_name: tx.provider_name,
      provider_status: tx.provider_status,
      recipient_name: tx.recipient_name,
      recipient_account: tx.recipient_account,
      recipient_bank: tx.recipient_bank,
      created_at: tx.created_at,
    },
    {
      code: 'TRANSFER_STAGED',
      message: 'Transfer debited from your wallet float and staged for bank confirmation. This has not yet been confirmed as delivered.',
      requestId: agent.requestId,
      environment: 'PRODUCTION',
    }
  );
}
