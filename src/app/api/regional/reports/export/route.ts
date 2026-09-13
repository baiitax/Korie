import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, maskName, maskPhone } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/** Datasets a manager may export — every row is territory-scoped and
 *  PII-masked the same way the live pages are. */
const DATASETS = ['aggregator_performance', 'agent_network', 'transactions', 'liquidity', 'commissions'] as const;
type Dataset = (typeof DATASETS)[number];

const MAX_ROWS = 5000;
const MAX_EXPORTS_PER_HOUR = 10;

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
}

/**
 * POST /api/regional/reports/export — server-side CSV generation.
 * Security contract (spec §48): authenticated manager + regional scope +
 * export permission + dataset allow-list + row cap + per-manager hourly
 * rate limit (from the export audit table) + audit row for every export.
 * Only data the manager can already see in the portal is exported, with
 * the same masking.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.reports.export');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const dataset = String(body.dataset || '') as Dataset;
  const from = body.from ? new Date(String(body.from)) : new Date(Date.now() - 30 * 86400_000);
  const to = body.to ? new Date(String(body.to)) : new Date();
  if (!DATASETS.includes(dataset)) {
    return createErrorResponse({
      code: 'INVALID_DATASET',
      message: `dataset must be one of ${DATASETS.join(', ')}.`,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 422,
    });
  }
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return createErrorResponse({ code: 'INVALID_RANGE', message: 'The date range is not valid.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 422 });
  }

  /* Rate limit from the audit table (real, per manager). */
  const { count: recent } = await admin
    .from('regional_report_exports')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', manager.managerId)
    .gte('created_at', new Date(Date.now() - 3600_000).toISOString());
  if ((recent ?? 0) >= MAX_EXPORTS_PER_HOUR) {
    return createErrorResponse({
      code: 'EXPORT_RATE_LIMITED',
      message: `Export limit reached (${MAX_EXPORTS_PER_HOUR} per hour). Try again later.`,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 429,
    });
  }

  const scope = await resolveTerritoryScope(manager);
  const since = from.toISOString();
  const until = to.toISOString();
  let headers: string[] = [];
  let rows: unknown[][] = [];

  if (dataset === 'aggregator_performance') {
    headers = ['aggregator_code', 'aggregator_name', 'status', 'regions', 'agents_total', 'agents_active', 'tx_count', 'tx_volume', 'currency'];
    const agentToAgg = new Map<string, string>();
    scope.agents.forEach((a) => {
      if (a.aggregator_territory_id) {
        const aggId = scope.aggregatorByTerritory.get(a.aggregator_territory_id);
        if (aggId) agentToAgg.set(a.id, aggId);
      }
    });
    const { data: aggs } = scope.aggregatorIds.length > 0
      ? await admin.from('aggregators').select('id, aggregator_code, business_name, status').in('id', scope.aggregatorIds)
      : { data: [] };
    const perf = new Map<string, { count: number; volume: number; currency: string }>();
    if (scope.agentIds.length > 0) {
      const { data: txRows } = await admin
        .from('agency_transactions')
        .select('agent_id, amount, currency, status, created_at')
        .in('agent_id', scope.agentIds)
        .gte('created_at', since)
        .lte('created_at', until)
        .limit(50000);
      (txRows ?? []).forEach((tx: any) => {
        if (tx.status !== 'SUCCESSFUL' && tx.status !== 'COMPLETED') return;
        const aggId = agentToAgg.get(tx.agent_id);
        if (!aggId) return;
        const e = perf.get(aggId) ?? { count: 0, volume: 0, currency: tx.currency || 'NGN' };
        e.count += 1;
        e.volume += Number(tx.amount || 0);
        perf.set(aggId, e);
      });
    }
    rows = ((aggs as any[]) ?? []).map((a) => {
      const agents = scope.agents.filter((x) => agentToAgg.get(x.id) === a.id);
      const p = perf.get(a.id) ?? { count: 0, volume: 0, currency: manager.country === 'NG' ? 'NGN' : 'XOF' };
      const regions = scope.territories.filter((t) => t.aggregator_id === a.id).map((t) => t.state_or_region).join('; ');
      return [a.aggregator_code, a.business_name, a.status, regions, agents.length, agents.filter((x) => x.status === 'ACTIVE').length, p.count, p.volume.toFixed(2), p.currency];
    });
  } else if (dataset === 'agent_network') {
    headers = ['agent_code', 'agent_name', 'state_or_region', 'status', 'aggregator_code', 'registered_at'];
    const aggCodes = new Map<string, string>();
    if (scope.aggregatorIds.length > 0) {
      const { data: aggs } = await admin.from('aggregators').select('id, aggregator_code').in('id', scope.aggregatorIds);
      (aggs ?? []).forEach((a: any) => aggCodes.set(a.id, a.aggregator_code));
    }
    rows = scope.agents.slice(0, MAX_ROWS).map((a) => [
      a.agent_code,
      maskName(a.agent_name),
      a.state_or_region,
      a.status,
      a.aggregator_territory_id ? aggCodes.get(scope.aggregatorByTerritory.get(a.aggregator_territory_id) ?? '') ?? '' : '',
      a.created_at,
    ]);
  } else if (dataset === 'transactions') {
    headers = ['reference', 'created_at', 'agent_code', 'type', 'amount', 'currency', 'status', 'customer_name_masked', 'customer_phone_masked'];
    const agentCodes = new Map(scope.agents.map((a) => [a.id, a.agent_code]));
    if (scope.agentIds.length > 0) {
      const { data: txRows } = await admin
        .from('agency_transactions')
        .select('agent_id, reference, transaction_type, amount, currency, status, customer_name, customer_phone, created_at')
        .in('agent_id', scope.agentIds)
        .gte('created_at', since)
        .lte('created_at', until)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);
      rows = (txRows ?? []).map((tx: any) => [
        tx.reference,
        tx.created_at,
        agentCodes.get(tx.agent_id) ?? '',
        tx.transaction_type,
        Number(tx.amount || 0).toFixed(2),
        tx.currency,
        tx.status,
        maskName(tx.customer_name),
        maskPhone(tx.customer_phone),
      ]);
    }
  } else if (dataset === 'liquidity') {
    headers = ['agent_code', 'agent_name_masked', 'state_or_region', 'account_kind', 'currency', 'ledger_balance', 'cash_threshold_min', 'status'];
    const { liquidityStatus } = await import('@/lib/regional/territoryScope');
    if (scope.agentIds.length > 0) {
      const { data: floatRows } = await admin
        .from('agent_float_accounts')
        .select('agent_id, account_kind, currency, cash_threshold_min, ledger_accounts(balance)')
        .in('agent_id', scope.agentIds)
        .limit(MAX_ROWS);
      const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
      rows = (floatRows ?? []).map((f: any) => {
        const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
        const bal = la ? Number(la.balance || 0) : null;
        const threshold = f.cash_threshold_min !== null && f.cash_threshold_min !== undefined ? Number(f.cash_threshold_min) : null;
        return [
          agentMeta.get(f.agent_id)?.agent_code ?? '',
          maskName(agentMeta.get(f.agent_id)?.agent_name),
          agentMeta.get(f.agent_id)?.state_or_region ?? '',
          f.account_kind,
          f.currency,
          bal !== null ? bal.toFixed(2) : '',
          threshold !== null ? threshold.toFixed(2) : '',
          bal !== null ? liquidityStatus(bal, threshold) : 'UNKNOWN',
        ];
      });
    }
  } else if (dataset === 'commissions') {
    headers = ['agent_code', 'agent_name_masked', 'state_or_region', 'amount', 'currency', 'status', 'earned_at', 'settled_at'];
    const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
    if (scope.agentIds.length > 0) {
      const { data: commRows } = await admin
        .from('agent_commissions')
        .select('agent_id, amount, currency, status, earned_at, settled_at')
        .in('agent_id', scope.agentIds)
        .gte('earned_at', since)
        .lte('earned_at', until)
        .order('earned_at', { ascending: false })
        .limit(MAX_ROWS);
      rows = (commRows ?? []).map((cm: any) => [
        agentMeta.get(cm.agent_id)?.agent_code ?? '',
        maskName(agentMeta.get(cm.agent_id)?.agent_name),
        agentMeta.get(cm.agent_id)?.state_or_region ?? '',
        Number(cm.amount || 0).toFixed(2),
        cm.currency,
        cm.status,
        cm.earned_at,
        cm.settled_at ?? '',
      ]);
    }
  }

  const csv = toCsv(headers, rows);

  /* Audit every export — append-only record. */
  await admin.from('regional_report_exports').insert({
    manager_id: manager.managerId,
    dataset,
    params: { from: since, to: until },
    row_count: rows.length,
    status: 'GENERATED',
    ip_address: req.headers.get('x-forwarded-for') ?? null,
  });
  await admin.from('audit_events').insert({
    actor_id: manager.managerId,
    actor_email: manager.email,
    actor_role: 'REGIONAL_MANAGER',
    action: 'REGIONAL_REPORT_EXPORTED',
    resource_type: 'regional:report',
    resource_id: dataset,
    details: { dataset, from: since, to: until, rows: rows.length },
    before_state: null,
    after_state: { rows: rows.length },
    ip_address: req.headers.get('x-forwarded-for') ?? 'unrecorded',
    request_id: `KP-REQ-${Date.now()}`,
    correlation_id: `KP-REQ-${Date.now()}`,
  });

  return createSuccessResponse(
    {
      dataset,
      from: since,
      to: until,
      rowCount: rows.length,
      csv,
      filename: `koriepay-regional-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`,
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
