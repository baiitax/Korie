import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/sub-agents
 *
 * A SUPER_AGENT's real downline (public.agents rows where
 * supervisor_agent_id = the authenticated super agent), joined with their
 * real WALLET_FLOAT / CASH_IN_HAND ledger balances and today's real
 * transaction volume. Non-super-agent tiers get an empty list (the frontend
 * already gates the whole Team page on tier === SUPER_AGENT).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  if (agent.tier !== 'SUPER_AGENT') {
    return createSuccessResponse({ sub_agents: [], allocations: [] }, { code: 'SUB_AGENTS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' });
  }

  const { data: subAgents, error } = await admin
    .from('agents')
    .select('id, agent_code, agent_name, business_name, phone, country, city_or_lga, status, daily_cash_limit, created_at')
    .eq('supervisor_agent_id', agent.agentId)
    .order('agent_name', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'SUB_AGENTS_LOOKUP_FAILED', message: 'Could not load sub-agents.', requestId: agent.requestId, httpStatus: 500 });
  }

  const subAgentIds = (subAgents || []).map((s: any) => s.id);

  let floatByAgent: Record<string, { walletFloat: number; cashInHand: number; currency: string; threshold: number }> = {};
  let volumeByAgent: Record<string, { volume: number; count: number }> = {};

  if (subAgentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, account_kind, currency, cash_threshold_min, ledger_accounts(balance)')
      .in('agent_id', subAgentIds);

    for (const row of floatRows || []) {
      const agentId = (row as any).agent_id;
      const bal = Number((row as any).ledger_accounts?.balance || 0);
      if (!floatByAgent[agentId]) {
        floatByAgent[agentId] = { walletFloat: 0, cashInHand: 0, currency: (row as any).currency, threshold: Number((row as any).cash_threshold_min) };
      }
      if ((row as any).account_kind === 'WALLET_FLOAT') floatByAgent[agentId].walletFloat = bal;
      if ((row as any).account_kind === 'CASH_IN_HAND') floatByAgent[agentId].cashInHand = bal;
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: txRows } = await admin
      .from('agency_transactions')
      .select('agent_id, amount')
      .in('agent_id', subAgentIds)
      .in('status', ['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'])
      .gte('created_at', today);

    for (const row of txRows || []) {
      const agentId = (row as any).agent_id;
      if (!volumeByAgent[agentId]) volumeByAgent[agentId] = { volume: 0, count: 0 };
      volumeByAgent[agentId].volume += Number((row as any).amount);
      volumeByAgent[agentId].count += 1;
    }
  }

  const mapped = (subAgents || []).map((s: any) => {
    const floatInfo = floatByAgent[s.id] || { walletFloat: 0, cashInHand: 0, currency: 'NGN', threshold: 200000 };
    const vol = volumeByAgent[s.id] || { volume: 0, count: 0 };
    const health =
      floatInfo.walletFloat <= 0
        ? 'CRITICAL'
        : floatInfo.walletFloat < floatInfo.threshold
        ? 'LOW'
        : floatInfo.walletFloat < floatInfo.threshold * 2
        ? 'WATCH'
        : 'HEALTHY';
    return {
      id: s.id,
      agent_code: s.agent_code,
      agent_name: s.agent_name,
      business_name: s.business_name,
      phone: s.phone,
      country: s.country,
      city_or_lga: s.city_or_lga,
      status: s.status === 'SUSPENDED' ? 'SUSPENDED' : health === 'CRITICAL' || health === 'LOW' ? 'LOW_FLOAT' : 'ACTIVE',
      wallet_float: floatInfo.walletFloat,
      cash_in_hand: floatInfo.cashInHand,
      currency: floatInfo.currency,
      cash_threshold_min: floatInfo.threshold,
      health,
      daily_cash_limit: Number(s.daily_cash_limit),
      today_transaction_count: vol.count,
      today_volume: vol.volume,
      onboarded_at: s.created_at,
    };
  });

  const { data: allocations } = await admin
    .from('agent_float_allocations')
    .select('id, sub_agent_id, direction, amount, currency, note, created_at, agents!agent_float_allocations_sub_agent_id_fkey(agent_name)')
    .eq('super_agent_id', agent.agentId)
    .order('created_at', { ascending: false })
    .limit(30);

  return createSuccessResponse(
    {
      sub_agents: mapped,
      allocations: (allocations || []).map((a: any) => ({
        id: a.id,
        sub_agent_name: a.agents?.agent_name || 'Sub-Agent',
        direction: a.direction,
        amount: Number(a.amount),
        currency: a.currency,
        note: a.note,
        timestamp: a.created_at,
      })),
    },
    { code: 'SUB_AGENTS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
