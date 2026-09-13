import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, liquidityStatus } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/notifications — the Regional Alert Center. Every item
 * is derived from a real event row in the operational stores: open risk
 * alerts, live liquidity threshold breaches, escalations the manager
 * filed, and aggregator status changes in the audit trail. Grouped by
 * severity. Nothing here is synthesized from nothing.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.notifications.manage');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const scope = await resolveTerritoryScope(manager);
  type Sev = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  interface Note { id: string; severity: Sev; title: string; detail: string; at: string; source: string }
  const notes: Note[] = [];

  /* 1. Open risk alerts from the aggregator risk engine. */
  if (scope.aggregatorIds.length > 0) {
    const { data: alerts } = await admin
      .from('aggregator_risk_alerts')
      .select('id, alert_type, severity, details, recommended_action, status, detected_at')
      .eq('status', 'OPEN')
      .in('aggregator_id', scope.aggregatorIds)
      .order('detected_at', { ascending: false })
      .limit(50);
    (alerts ?? []).forEach((a: any) => {
      const sev: Sev = ['CRITICAL', 'HIGH'].includes(String(a.severity).toUpperCase()) ? (String(a.severity).toUpperCase() as Sev) : 'MEDIUM';
      notes.push({
        id: `alert:${a.id}`,
        severity: sev,
        title: a.alert_type,
        detail: a.recommended_action || 'Risk alert open — review in the Risk center.',
        at: a.detected_at,
        source: 'Risk engine',
      });
    });
  }

  /* 2. Live liquidity threshold breaches (computed now, from the ledger). */
  if (scope.agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, currency, cash_threshold_min, ledger_accounts(balance)')
      .in('agent_id', scope.agentIds);
    const agentMeta = new Map(scope.agents.map((a) => [a.id, a]));
    const breaches = new Map<string, { n: number; agent: string }>();
    (floatRows ?? []).forEach((f: any) => {
      const la = Array.isArray(f.ledger_accounts) ? f.ledger_accounts[0] : f.ledger_accounts;
      if (!la) return;
      const threshold = f.cash_threshold_min !== null && f.cash_threshold_min !== undefined ? Number(f.cash_threshold_min) : null;
      const st = liquidityStatus(Number(la.balance || 0), threshold);
      if (st === 'LOW' || st === 'CRITICAL') {
        const cur = f.currency || 'NGN';
        const key = `${st}:${cur}`;
        const e = breaches.get(key) ?? { n: 0, agent: agentMeta.get(f.agent_id)?.agent_code ?? '—' };
        e.n += 1;
        breaches.set(key, e);
      }
    });
    breaches.forEach((v, key) => {
      const [st, cur] = key.split(':');
      notes.push({
        id: `liquidity:${key}`,
        severity: st === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: st === 'CRITICAL' ? 'Agent float has fallen below the operational threshold' : 'Agent float approaching the operational threshold',
        detail: `${v.n} float account(s) in ${st.toLowerCase()} state (${cur}). Coverage rule: balance ÷ configured cash threshold. First affected agent ${v.agent}.`,
        at: new Date().toISOString(),
        source: 'Liquidity monitor',
      });
    });
  }

  /* 3. Escalations the manager filed — status updates. */
  if (manager.officerId) {
    const { data: mine } = await admin
      .from('support_escalations')
      .select('id, escalation_number, status, destination, created_at, resolved_at, support_tickets(ticket_number, subject)')
      .eq('created_by_officer_id', manager.officerId)
      .order('created_at', { ascending: false })
      .limit(30);
    (mine ?? []).forEach((e: any) => {
      const t = Array.isArray(e.support_tickets) ? e.support_tickets[0] : e.support_tickets;
      const open = e.status !== 'RESOLVED';
      notes.push({
        id: `escalation:${e.id}`,
        severity: open ? 'INFO' : 'INFO',
        title: open ? `Your escalation ${e.escalation_number} is with ${e.destination}` : `Your escalation ${e.escalation_number} was resolved`,
        detail: t ? `${t.subject} (ticket ${t.ticket_number}) — status ${e.status}.` : `Status ${e.status}.`,
        at: e.resolved_at || e.created_at,
        source: 'Support desk',
      });
    });
  }

  /* 4. Aggregator status changes from the audit trail (last 14 days). */
  if (scope.aggregatorIds.length > 0) {
    const { data: audit } = await admin
      .from('audit_events')
      .select('id, action, details, created_at')
      .in('resource_id', scope.aggregatorIds)
      .gte('created_at', new Date(Date.now() - 14 * 86400_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
    (audit ?? []).forEach((e: any) => {
      notes.push({
        id: `audit:${e.id}`,
        severity: 'INFO',
        title: e.action,
        detail: e.details ? JSON.stringify(e.details).slice(0, 180) : 'Audited aggregator event.',
        at: e.created_at,
        source: 'Audit trail',
      });
    });
  }

  const order: Sev[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'];
  notes.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity) || new Date(b.at).getTime() - new Date(a.at).getTime());

  return createSuccessResponse(
    {
      notes: notes.slice(0, 120),
      counts: {
        critical: notes.filter((n) => n.severity === 'CRITICAL').length,
        high: notes.filter((n) => n.severity === 'HIGH').length,
        medium: notes.filter((n) => n.severity === 'MEDIUM').length,
        info: notes.filter((n) => n.severity === 'INFO').length,
      },
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
