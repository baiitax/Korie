import { NextRequest } from 'next/server';
import { authenticateRegionalManagerRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/float
 *
 * Float oversight for the manager's territory: every agent float account
 * with its REAL ledger balance, and the float top-up queue (pending first).
 * Balances come from ledger_accounts via the service role — never client
 * arithmetic.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRegionalManagerRequest(req);
  if (!auth.isAuthenticated || !auth.manager) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Not authorized.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const { country, territories } = auth.manager;
  const admin = getSupabaseAdminClient();

  const { data: agents } = await admin
    .from('agents')
    .select('id, agent_code, agent_name, state_or_region, status')
    .eq('country', country)
    .in('state_or_region', territories);
  const agentRows = agents ?? [];
  const agentIds = agentRows.map((a: any) => a.id);
  const agentMeta = new Map(agentRows.map((a: any) => [a.id, a]));

  const accounts: any[] = [];
  const requests: any[] = [];

  if (agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('id, agent_id, account_kind, currency, cash_threshold_min, ledger_accounts(id, balance)')
      .in('agent_id', agentIds)
      .order('currency');
    (floatRows ?? []).forEach((f: any) => {
      const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
      const agent = agentMeta.get(f.agent_id);
      accounts.push({
        id: f.id,
        agentId: f.agent_id,
        agentCode: agent?.agent_code ?? '—',
        agentName: agent?.agent_name ?? '—',
        agentStatus: agent?.status ?? '—',
        stateOrRegion: agent?.state_or_region ?? '—',
        kind: f.account_kind,
        currency: f.currency,
        balance: la ? Number(la.balance || 0) : null,
        thresholdMin: f.cash_threshold_min !== null && f.cash_threshold_min !== undefined ? Number(f.cash_threshold_min) : null,
        ledgerAccountId: la?.id ?? null,
      });
    });

    const { data: requestRows } = await admin
      .from('agent_float_topup_requests')
      .select('id, agent_id, amount, currency, method, proof_reference, status, requested_at, reviewed_by, reviewed_at, notes')
      .in('agent_id', agentIds)
      .order('requested_at', { ascending: false })
      .limit(200);
    (requestRows ?? []).forEach((r: any) => {
      const agent = agentMeta.get(r.agent_id);
      requests.push({
        id: r.id,
        agentId: r.agent_id,
        agentCode: agent?.agent_code ?? '—',
        agentName: agent?.agent_name ?? '—',
        stateOrRegion: agent?.state_or_region ?? '—',
        amount: Number(r.amount || 0),
        currency: r.currency,
        method: r.method,
        proofReference: r.proof_reference ?? null,
        status: r.status,
        requestedAt: r.requested_at,
        reviewedBy: r.reviewed_by ?? null,
        reviewedAt: r.reviewed_at ?? null,
        notes: r.notes ?? null,
      });
    });
  }

  return createSuccessResponse(
    { accounts, requests, country, territories },
    { requestId: auth.manager.requestId, environment: 'PRODUCTION' },
  );
}
