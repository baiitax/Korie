import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, maskName } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/search?q= — global regional search across aggregators,
 * agents, merchants, transactions and support cases. Every branch filters
 * by the manager's territory BEFORE matching, so a record outside the
 * region is indistinguishable from a record that does not exist — no
 * existence leak through results, counts or errors.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.search.use');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return createSuccessResponse({ results: [] }, { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' });
  }
  const like = `%${q}%`;

  const scope = await resolveTerritoryScope(manager);
  const results: { type: string; label: string; sublabel: string; href: string }[] = [];

  /* Aggregators in territory. */
  if (scope.aggregatorIds.length > 0) {
    const { data } = await admin
      .from('aggregators')
      .select('id, aggregator_code, business_name, status')
      .in('id', scope.aggregatorIds)
      .or(`business_name.ilike.${like},aggregator_code.ilike.${like}`)
      .limit(5);
    (data ?? []).forEach((a: any) =>
      results.push({ type: 'AGGREGATOR', label: a.business_name, sublabel: `${a.aggregator_code} · ${a.status}`, href: `/regional/aggregators/${a.id}` }),
    );
  }

  /* Agents in territory. */
  const agentMatches = scope.agents
    .filter((a) => a.agent_name.toLowerCase().includes(q.toLowerCase()) || a.agent_code.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 5);
  agentMatches.forEach((a) =>
    results.push({ type: 'AGENT', label: maskName(a.agent_name), sublabel: `${a.agent_code} · ${a.state_or_region} · ${a.status}`, href: '/regional/agents' }),
  );

  /* Merchants linked to territory. */
  const territoryIds = scope.territories.map((t) => t.id);
  if (territoryIds.length > 0) {
    const { data } = await admin
      .from('merchant_profiles')
      .select('id, merchant_code, business_name, status')
      .in('aggregator_territory_id', territoryIds)
      .or(`business_name.ilike.${like},merchant_code.ilike.${like}`)
      .limit(5);
    (data ?? []).forEach((m: any) =>
      results.push({ type: 'MERCHANT', label: m.business_name, sublabel: `${m.merchant_code} · ${m.status}`, href: '/regional/merchants' }),
    );
  }

  /* Transactions by reference (territory agents only). */
  if (scope.agentIds.length > 0) {
    const { data } = await admin
      .from('agency_transactions')
      .select('id, reference, agent_id, amount, currency, status, created_at')
      .in('agent_id', scope.agentIds)
      .ilike('reference', like)
      .order('created_at', { ascending: false })
      .limit(5);
    const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
    (data ?? []).forEach((tx: any) =>
      results.push({
        type: 'TRANSACTION',
        label: tx.reference,
        sublabel: `${tx.status} · ${tx.currency} ${Number(tx.amount).toLocaleString()} · ${agentMeta.get(tx.agent_id)?.agent_code ?? ''}`,
        href: `/regional/transactions?q=${encodeURIComponent(tx.reference)}`,
      }),
    );
  }

  /* Support cases in jurisdiction. */
  const { data: tickets } = await admin
    .from('support_tickets')
    .select('id, ticket_number, subject, status')
    .eq('jurisdiction', manager.country)
    .or(`ticket_number.ilike.${like},subject.ilike.${like}`)
    .order('created_at', { ascending: false })
    .limit(5);
  (tickets ?? []).forEach((t: any) =>
    results.push({ type: 'CASE', label: t.ticket_number, sublabel: `${t.subject.slice(0, 60)} · ${t.status}`, href: '/regional/support' }),
  );

  return createSuccessResponse(
    { results },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
