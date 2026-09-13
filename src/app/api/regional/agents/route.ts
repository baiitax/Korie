import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/agents
 *
 * Agents inside the manager's territory, each with real operational facts:
 * float balances (from the ledger), lifetime agency transaction count and
 * volume, and the last time they transacted. Honest empty states when an
 * agent has never transacted.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.agents.view');
  if (!auth.ok) return auth.response;
  const { country, territories } = auth.manager;
  const admin = getSupabaseAdminClient();

  const { data: agents, error } = await admin
    .from('agents')
    .select(
      'id, agent_code, agent_name, business_name, state_or_region, city_or_lga, status, kyc_status, tier, aggregator_territory_id, created_at',
    )
    .eq('country', country)
    .in('state_or_region', territories)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    return createErrorResponse({
      code: 'AGENTS_READ_FAILED',
      message: 'The agent register could not be read.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 503,
    });
  }

  const agentIds = (agents ?? []).map((a: any) => a.id);
  const territoryNames = new Map<string, string>();
  if (agentIds.length > 0) {
    const { data: terrRows } = await admin
      .from('aggregator_territories')
      .select('id, name, state_or_region, aggregators(business_name, aggregator_code)')
      .eq('country', country)
      .in('state_or_region', territories);
    (terrRows ?? []).forEach((t: any) => {
      const agg = Array.isArray(t.aggregators) ? t.aggregators[0] : t.aggregators;
      territoryNames.set(t.id, agg ? `${agg.aggregator_code} · ${agg.business_name}` : t.name);
    });
  }

  /* Float balances per agent, by currency — from the real ledger accounts. */
  const floatByAgent = new Map<string, Record<string, number>>();
  if (agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, currency, ledger_accounts(balance)')
      .in('agent_id', agentIds);
    (floatRows ?? []).forEach((f: any) => {
      const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
      if (!la) return;
      const cur = f.currency || 'NGN';
      const per = floatByAgent.get(f.agent_id) ?? {};
      per[cur] = (per[cur] || 0) + Number(la.balance || 0);
      floatByAgent.set(f.agent_id, per);
    });
  }

  /* Lifetime activity per agent. */
  const activityByAgent = new Map<string, { count: number; volume: number; currency: string; lastAt: string | null }>();
  if (agentIds.length > 0) {
    const { data: txRows } = await admin
      .from('agency_transactions')
      .select('agent_id, amount, currency, status, created_at')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(20000);
    (txRows ?? []).forEach((tx: any) => {
      if (tx.status !== 'SUCCESSFUL' && tx.status !== 'COMPLETED') return;
      const cur = tx.currency || 'NGN';
      const a = activityByAgent.get(tx.agent_id) ?? { count: 0, volume: 0, currency: cur, lastAt: null };
      a.count += 1;
      a.volume += Number(tx.amount || 0);
      if (!a.lastAt) a.lastAt = tx.created_at;
      activityByAgent.set(tx.agent_id, a);
    });
  }

  const rows = (agents ?? []).map((a: any) => ({
    id: a.id,
    code: a.agent_code,
    name: a.agent_name,
    businessName: a.business_name ?? null,
    stateOrRegion: a.state_or_region,
    cityOrLga: a.city_or_lga ?? null,
    status: a.status,
    kycStatus: a.kyc_status,
    tier: a.tier ?? null,
    aggregator: a.aggregator_territory_id ? territoryNames.get(a.aggregator_territory_id) ?? null : null,
    floatByCurrency: floatByAgent.get(a.id) ?? {},
    transactions: activityByAgent.get(a.id) ?? { count: 0, volume: 0, currency: country === 'NG' ? 'NGN' : 'XOF', lastAt: null },
    registeredAt: a.created_at,
  }));

  return createSuccessResponse(
    { agents: rows, country, territories },
    { requestId: auth.manager.requestId, environment: 'PRODUCTION' },
  );
}
