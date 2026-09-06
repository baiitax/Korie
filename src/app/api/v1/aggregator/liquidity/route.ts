import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/liquidity — real network liquidity position:
 * aggregator's own float/reserve ledger balances plus the sum of every
 * supervised agent's real WALLET_FLOAT/CASH_IN_HAND balances.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agg } = await admin.from('aggregators').select('float_account_id, reserve_account_id').eq('id', staff.aggregatorId).single();

  let aggregatorMainWallet = 0;
  let aggregatorReserveWallet = 0;
  const accountIds = [agg?.float_account_id, agg?.reserve_account_id].filter(Boolean) as string[];
  if (accountIds.length > 0) {
    const { data: accounts } = await admin.from('ledger_accounts').select('id, balance').in('id', accountIds);
    for (const a of accounts || []) {
      if ((a as any).id === agg?.float_account_id) aggregatorMainWallet = Number((a as any).balance);
      if ((a as any).id === agg?.reserve_account_id) aggregatorReserveWallet = Number((a as any).balance);
    }
  }

  const { data: agentRows } = await admin.from('agents').select('id').eq('org_id', staff.orgId);
  const agentIds = (agentRows || []).map((a: any) => a.id);

  let totalAgentFloatLiquidity = 0;
  let estimatedCashInNetworkDrawer = 0;
  let agentsUnderMinimumThresholdCount = 0;
  let agentsRequiringFloatCount = 0;

  if (agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, account_kind, cash_threshold_min, ledger_accounts(balance)')
      .in('agent_id', agentIds);

    const walletByAgent: Record<string, number> = {};
    const thresholdByAgent: Record<string, number> = {};

    for (const row of floatRows || []) {
      const id = (row as any).agent_id;
      const bal = Number((row as any).ledger_accounts?.balance || 0);
      if ((row as any).account_kind === 'WALLET_FLOAT') {
        totalAgentFloatLiquidity += bal;
        walletByAgent[id] = bal;
        thresholdByAgent[id] = Number((row as any).cash_threshold_min);
      }
      if ((row as any).account_kind === 'CASH_IN_HAND') {
        estimatedCashInNetworkDrawer += bal;
      }
    }

    for (const id of Object.keys(walletByAgent)) {
      const threshold = thresholdByAgent[id] ?? 200000;
      if (walletByAgent[id] < threshold) agentsUnderMinimumThresholdCount += 1;
      if (walletByAgent[id] <= 0) agentsRequiringFloatCount += 1;
    }
  }

  const networkLiquidityHealth =
    agentsRequiringFloatCount > 0 ? 'CRITICAL' : agentsUnderMinimumThresholdCount > 3 ? 'WATCH' : agentsUnderMinimumThresholdCount > 0 ? 'NORMAL' : 'HEALTHY';

  return createSuccessResponse(
    {
      aggregatorMainWallet,
      aggregatorReserveWallet,
      totalAgentFloatLiquidity,
      totalMerchantSettlementFloat: 0,
      estimatedCashInNetworkDrawer,
      networkLiquidityHealth,
      agentsUnderMinimumThresholdCount,
      agentsRequiringFloatCount,
    },
    { code: 'LIQUIDITY_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
