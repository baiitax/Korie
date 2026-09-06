import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { quoteAgencyCommission } from '@/lib/agency/commissionPricing';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/quote?type=CASH_IN&currency=NGN&amount=50000
 *
 * Read-only, side-effect-free fee/commission preview used by every
 * transaction form (cash-in, cash-out, transfer) to render "Agent
 * Commission: +₦35" BEFORE the agent submits. This is the same
 * agent_commission_rates lookup the real posting endpoints use — the UI
 * never estimates this with a hardcoded constant or a client-side formula.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const currency = (url.searchParams.get('currency') || 'NGN') as 'NGN' | 'XOF';
  const amount = Number(url.searchParams.get('amount') || 0);

  if (!type || !['CASH_IN', 'CASH_OUT', 'TRANSFER_NIP', 'TRANSFER_CROSS_BORDER'].includes(type)) {
    return createErrorResponse({ code: 'INVALID_TRANSACTION_TYPE', message: 'type must be one of CASH_IN, CASH_OUT, TRANSFER_NIP, TRANSFER_CROSS_BORDER.', requestId: agent.requestId, httpStatus: 400 });
  }
  if (!amount || amount <= 0) {
    return createSuccessResponse(
      { customer_fee: 0, agent_commission: 0, total: 0 },
      { code: 'QUOTE_ZERO_AMOUNT', requestId: agent.requestId, environment: 'PRODUCTION' }
    );
  }

  const admin = getSupabaseAdminClient();
  try {
    const quote = await quoteAgencyCommission(admin, { transactionType: type as any, currency, amount });
    return createSuccessResponse(
      {
        customer_fee: quote.customerFee,
        agent_commission: quote.agentCommission,
        total: type === 'CASH_IN' ? amount : amount + quote.customerFee,
      },
      { code: 'QUOTE_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
    );
  } catch (err: any) {
    const code = err?.message?.includes('NO_ACTIVE_COMMISSION_RATE') ? 'NO_ACTIVE_COMMISSION_RATE' : 'QUOTE_FAILED';
    return createErrorResponse({ code, message: 'Could not price this amount.', requestId: agent.requestId, httpStatus: 422 });
  }
}
