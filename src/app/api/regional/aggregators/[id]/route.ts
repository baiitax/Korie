import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, aggregatorInScope, activityClass, maskName, maskPhone } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/aggregators/[id] — Aggregator 360 operational profile.
 * The id must resolve to an aggregator with a territory inside the
 * manager's region (server-side check — no client-supplied scope is
 * trusted). Read-only supervision.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeRegionalRequest(req, 'regional.aggregators.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);
  if (!aggregatorInScope(scope, params.id)) {
    /* Outside the manager's territory — indistinguishable from not found. */
    return createErrorResponse({
      code: 'AGGREGATOR_NOT_FOUND',
      message: 'No aggregator with that reference exists in your territory.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 404,
    });
  }

  const { data: agg } = await admin
    .from('aggregators')
    .select('id, aggregator_code, business_name, legal_entity, rc_number, country, currency, tier, status, kyb_status, headquarters, contact_email, contact_phone, settlement_bank, settlement_account_number, float_account_id, reserve_account_id, escrow_account_id, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!agg) {
    return createErrorResponse({
      code: 'AGGREGATOR_NOT_FOUND',
      message: 'No aggregator with that reference exists in your territory.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 404,
    });
  }

  /* Territory rows for this aggregator. */
  const territories = scope.territories.filter((t) => t.aggregator_id === agg.id);

  /* Agents under this aggregator (via its territories). */
  const territoryIds = new Set(territories.map((t) => t.id));
  const agents = scope.agents.filter((a) => a.aggregator_territory_id && territoryIds.has(a.aggregator_territory_id));
  const agentIds = agents.map((a) => a.id);

  /* Financial performance (90-day window). */
  const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
  const byType: Record<string, Record<string, { count: number; volume: number }>> = {};
  const byStatus30: Record<string, number> = {};
  const lastTxByAgent = new Map<string, string>();
  if (agentIds.length > 0) {
    const { data: txRows } = await admin
      .from('agency_transactions')
      .select('agent_id, transaction_type, amount, currency, status, created_at')
      .in('agent_id', agentIds)
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
      .limit(50000);
    (txRows ?? []).forEach((tx: any) => {
      const cur = tx.currency || 'NGN';
      if (tx.status === 'SUCCESSFUL' || tx.status === 'COMPLETED') {
        byType[tx.transaction_type] = byType[tx.transaction_type] || {};
        byType[tx.transaction_type][cur] = byType[tx.transaction_type][cur] || { count: 0, volume: 0 };
        byType[tx.transaction_type][cur].count += 1;
        byType[tx.transaction_type][cur].volume += Number(tx.amount || 0);
        if (!lastTxByAgent.has(tx.agent_id)) lastTxByAgent.set(tx.agent_id, tx.created_at);
      }
      if (new Date(tx.created_at).getTime() >= Date.now() - 30 * 86400_000) {
        byStatus30[tx.status] = (byStatus30[tx.status] || 0) + 1;
      }
    });
  }

  /* Commissions. */
  const commissions: Record<string, { earned: number; settled: number; count: number }> = {};
  if (agentIds.length > 0) {
    const { data: commRows } = await admin
      .from('agent_commissions')
      .select('amount, currency, status')
      .in('agent_id', agentIds)
      .limit(20000);
    (commRows ?? []).forEach((cm: any) => {
      const cur = cm.currency || 'NGN';
      commissions[cur] = commissions[cur] || { earned: 0, settled: 0, count: 0 };
      commissions[cur].count += 1;
      if (cm.status === 'SETTLED') commissions[cur].settled += Number(cm.amount || 0);
      else commissions[cur].earned += Number(cm.amount || 0);
    });
  }

  /* Liquidity — the aggregator's own float/reserve/escrow ledger accounts
   * plus its agents' wallet float. Backend-authoritative balances only. */
  const liquidityAccounts: { kind: string; name: string; currency: string | null; balance: number | null; locked: number | null }[] = [];
  for (const [kind, accountId] of [
    ['AGGREGATOR_FLOAT', agg.float_account_id],
    ['AGGREGATOR_RESERVE', agg.reserve_account_id],
    ['AGGREGATOR_ESCROW', agg.escrow_account_id],
  ] as const) {
    if (!accountId) continue;
    const { data: la } = await admin
      .from('ledger_accounts')
      .select('name, currency, balance, locked_balance')
      .eq('id', accountId)
      .maybeSingle();
    if (la) liquidityAccounts.push({ kind, name: la.name, currency: la.currency, balance: Number(la.balance || 0), locked: Number(la.locked_balance || 0) });
  }
  const agentFloat: Record<string, number> = {};
  if (agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('currency, ledger_accounts(balance)')
      .in('agent_id', agentIds);
    (floatRows ?? []).forEach((f: any) => {
      const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
      if (!la) return;
      const cur = f.currency || 'NGN';
      agentFloat[cur] = (agentFloat[cur] || 0) + Number(la.balance || 0);
    });
  }

  /* Risk. */
  const alerts: any[] = [];
  const { data: alertRows } = await admin
    .from('aggregator_risk_alerts')
    .select('id, alert_type, severity, entity_type, details, recommended_action, status, detected_at')
    .eq('aggregator_id', agg.id)
    .order('detected_at', { ascending: false })
    .limit(25);
  (alertRows ?? []).forEach((a: any) => alerts.push(a));

  /* Support cases referencing this aggregator. */
  const tickets: any[] = [];
  const { data: ticketRows } = await admin
    .from('support_tickets')
    .select('id, ticket_number, subject, status, priority, category, created_at')
    .eq('customer_type', 'AGGREGATOR')
    .eq('customer_id', agg.id)
    .order('created_at', { ascending: false })
    .limit(25);
  (ticketRows ?? []).forEach((t: any) => tickets.push(t));

  /* Activity timeline — from the aggregator's own audited log and the
   * central audit trail. Append-only sources; nothing is synthesized. */
  const timeline: { at: string; action: string; actor: string; detail?: string }[] = [];
  const { data: aggAudit } = await admin
    .from('aggregator_audit_logs')
    .select('action, actor_staff_id, target_type, result, reason, created_at')
    .eq('aggregator_id', agg.id)
    .order('created_at', { ascending: false })
    .limit(30);
  (aggAudit ?? []).forEach((e: any) =>
    timeline.push({ at: e.created_at, action: e.action, actor: 'Aggregator staff', detail: [e.target_type, e.result, e.reason].filter(Boolean).join(' · ') || undefined }),
  );
  const { data: centralAudit } = await admin
    .from('audit_events')
    .select('action, actor_role, actor_email, created_at, details')
    .eq('resource_id', agg.id)
    .order('created_at', { ascending: false })
    .limit(30);
  (centralAudit ?? []).forEach((e: any) =>
    timeline.push({ at: e.created_at, action: e.action, actor: e.actor_role || e.actor_email || 'system', detail: e.details ? JSON.stringify(e.details).slice(0, 160) : undefined }),
  );
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  /* Agent list (masked PII-light — agent codes/names are operational data). */
  const agentProfiles = agents.slice(0, 200).map((a) => ({
    id: a.id,
    code: a.agent_code,
    name: maskName(a.agent_name),
    state: a.state_or_region,
    status: a.status,
    activity: activityClass(lastTxByAgent.get(a.id)),
  }));

  return createSuccessResponse(
    {
      identity: {
        id: agg.id,
        code: agg.aggregator_code,
        name: agg.business_name,
        legalEntity: agg.legal_entity ?? null,
        rcNumber: agg.rc_number ?? null,
        status: agg.status,
        kyb: agg.kyb_status,
        tier: agg.tier,
        country: agg.country,
        currency: agg.currency,
        regions: territories.map((t) => ({ name: t.name, state: t.state_or_region, code: t.code })),
        assignedManager: manager.fullName,
        contact: { email: agg.contact_email ?? null, phone: agg.contact_phone ? maskPhone(agg.contact_phone) : null },
        settlementBank: agg.settlement_bank ?? null,
        registeredAt: agg.created_at,
      },
      network: {
        agentsTotal: agents.length,
        agentsActive: agents.filter((a) => a.status === 'ACTIVE').length,
        agentsDormant: agents.filter((a) => activityClass(lastTxByAgent.get(a.id)) === 'DORMANT' || activityClass(lastTxByAgent.get(a.id)) === 'NO_ACTIVITY').length,
        agentsNew30d: agents.filter((a) => new Date(a.created_at).getTime() >= Date.now() - 30 * 86400_000).length,
        agentList: agentProfiles,
      },
      financial: { byType, byStatus30, commissions },
      liquidity: { accounts: liquidityAccounts, agentFloatByCurrency: agentFloat },
      risk: { alerts, openAlerts: alerts.filter((a) => a.status === 'OPEN').length },
      support: { tickets, open: tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length },
      timeline: timeline.slice(0, 40),
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
