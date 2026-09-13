import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, maskName, maskPhone } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/transactions — read-only regional transaction
 * monitoring. Server-side pagination + filters; the manager can never
 * mutate a financial transaction state from this portal — there is no
 * write path here at all.
 *
 * Query: page, pageSize (≤100), q (reference), agent, type, currency,
 * status, minAmount, maxAmount, from, to.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.transactions.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();
  const url = new URL(req.url);

  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize') || 25)));
  const q = (url.searchParams.get('q') || '').trim();
  const agentFilter = url.searchParams.get('agent') || '';
  const typeFilter = url.searchParams.get('type') || '';
  const currencyFilter = url.searchParams.get('currency') || '';
  const statusFilter = url.searchParams.get('status') || '';
  const minAmount = url.searchParams.get('minAmount');
  const maxAmount = url.searchParams.get('maxAmount');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const scope = await resolveTerritoryScope(manager);
  if (scope.agentIds.length === 0) {
    return createSuccessResponse(
      { items: [], total: 0, page, pageSize, pageCount: 1, summary: { byStatus: {}, byCurrency: {} } },
      { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
    );
  }

  let query = admin
    .from('agency_transactions')
    .select('id, agent_id, reference, transaction_type, amount, customer_fee, agent_commission, currency, status, failure_reason, customer_name, customer_phone, created_at', { count: 'exact' })
    .in('agent_id', scope.agentIds);

  if (agentFilter && scope.agentIds.includes(agentFilter)) query = query.eq('agent_id', agentFilter);
  if (typeFilter) query = query.eq('transaction_type', typeFilter);
  if (currencyFilter) query = query.eq('currency', currencyFilter);
  if (statusFilter) query = query.eq('status', statusFilter);
  if (minAmount && !Number.isNaN(Number(minAmount))) query = query.gte('amount', Number(minAmount));
  if (maxAmount && !Number.isNaN(Number(maxAmount))) query = query.lte('amount', Number(maxAmount));
  if (from) query = query.gte('created_at', new Date(from).toISOString());
  if (to) query = query.lte('created_at', new Date(to).toISOString());
  if (q) query = query.ilike('reference', `%${q}%`);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    return createErrorResponse({
      code: 'TRANSACTIONS_READ_FAILED',
      message: 'The transaction register could not be read.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 503,
    });
  }

  const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));

  /* Summary of the CURRENT filter (one extra bounded query). */
  let summaryQuery = admin
    .from('agency_transactions')
    .select('status, amount, currency')
    .in('agent_id', scope.agentIds);
  if (agentFilter && scope.agentIds.includes(agentFilter)) summaryQuery = summaryQuery.eq('agent_id', agentFilter);
  if (typeFilter) summaryQuery = summaryQuery.eq('transaction_type', typeFilter);
  if (currencyFilter) summaryQuery = summaryQuery.eq('currency', currencyFilter);
  if (statusFilter) summaryQuery = summaryQuery.eq('status', statusFilter);
  if (minAmount && !Number.isNaN(Number(minAmount))) summaryQuery = summaryQuery.gte('amount', Number(minAmount));
  if (maxAmount && !Number.isNaN(Number(maxAmount))) summaryQuery = summaryQuery.lte('amount', Number(maxAmount));
  if (from) summaryQuery = summaryQuery.gte('created_at', new Date(from).toISOString());
  if (to) summaryQuery = summaryQuery.lte('created_at', new Date(to).toISOString());
  if (q) summaryQuery = summaryQuery.ilike('reference', `%${q}%`);
  const { data: summaryRows } = await summaryQuery.limit(50000);
  const byStatus: Record<string, number> = {};
  const byCurrency: Record<string, { count: number; volume: number }> = {};
  (summaryRows ?? []).forEach((tx: any) => {
    byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
    const cur = tx.currency || 'NGN';
    byCurrency[cur] = byCurrency[cur] || { count: 0, volume: 0 };
    byCurrency[cur].count += 1;
    if (tx.status === 'SUCCESSFUL' || tx.status === 'COMPLETED') byCurrency[cur].volume += Number(tx.amount || 0);
  });

  const items = (data ?? []).map((tx: any) => {
    const agent = agentMeta.get(tx.agent_id);
    return {
      id: tx.id,
      reference: tx.reference,
      agent: agent ? { code: agent.agent_code, name: maskName(agent.agent_name), state: agent.state_or_region } : null,
      type: tx.transaction_type,
      amount: Number(tx.amount || 0),
      customerFee: tx.customer_fee !== null ? Number(tx.customer_fee) : null,
      agentCommission: tx.agent_commission !== null ? Number(tx.agent_commission) : null,
      currency: tx.currency,
      status: tx.status,
      failureReason: tx.failure_reason ?? null,
      customer: tx.customer_name ? { name: maskName(tx.customer_name), phone: maskPhone(tx.customer_phone) } : null,
      createdAt: tx.created_at,
    };
  });

  return createSuccessResponse(
    {
      items,
      total: count ?? 0,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      summary: { byStatus, byCurrency },
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
