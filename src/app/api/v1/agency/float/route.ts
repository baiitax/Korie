import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/float
 *
 * Returns the authenticated agent's REAL liquidity position, read directly
 * from public.ledger_accounts via public.agent_float_accounts. This is the
 * authoritative source — the frontend must not calculate or cache these
 * numbers independently of this endpoint.
 */
export async function GET(req: NextRequest) {
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
  const admin = getSupabaseAdminClient();

  const { data: floatAccounts, error } = await admin
    .from('agent_float_accounts')
    .select('account_kind, currency, cash_threshold_min, ledger_accounts(balance)')
    .eq('agent_id', agent.agentId);

  if (error) {
    return createErrorResponse({
      code: 'FLOAT_LOOKUP_FAILED',
      message: 'Could not load liquidity position.',
      requestId: agent.requestId,
      httpStatus: 500,
    });
  }

  if (!floatAccounts || floatAccounts.length === 0) {
    return createErrorResponse({
      code: 'AGENT_FLOAT_NOT_PROVISIONED',
      message: 'Your agent float account has not been provisioned yet. Contact support.',
      requestId: agent.requestId,
      httpStatus: 409,
    });
  }

  const walletFloatRow = floatAccounts.find((f: any) => f.account_kind === 'WALLET_FLOAT');
  const cashHandRow = floatAccounts.find((f: any) => f.account_kind === 'CASH_IN_HAND');

  const getBalance = (row: any): number => {
    const rel = row?.ledger_accounts;
    if (!rel) return 0;
    return Number(Array.isArray(rel) ? rel[0]?.balance ?? 0 : rel.balance ?? 0);
  };

  const walletFloat = getBalance(walletFloatRow);
  const cashInHand = getBalance(cashHandRow);
  const cashThresholdMin = Number(cashHandRow?.cash_threshold_min ?? 0);
  const currency = walletFloatRow?.currency || cashHandRow?.currency || 'NGN';

  const totalLiquidity = walletFloat + cashInHand;
  const health = cashInHand < cashThresholdMin ? 'LOW' : 'HEALTHY';

  return createSuccessResponse(
    {
      currency,
      wallet_float: walletFloat,
      cash_in_hand: cashInHand,
      total_liquidity: totalLiquidity,
      cash_threshold_min: cashThresholdMin,
      health,
    },
    {
      code: 'FLOAT_RETRIEVED',
      message: 'Liquidity position retrieved from ledger.',
      requestId: agent.requestId,
      environment: 'PRODUCTION',
    }
  );
}
