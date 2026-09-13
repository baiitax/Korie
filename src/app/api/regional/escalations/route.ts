import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, aggregatorInScope, agentInScope } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/escalations — the Regional Operations Inbox.
 *  • Jurisdiction inbox: open support tickets in the manager's country
 *    (the cases the regional network generates).
 *  • My escalations: escalations the manager filed through this portal,
 *    with live status from the support desk.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.support.manage');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  /* Open tickets in the manager's jurisdiction. */
  const { data: inboxRows } = await admin
    .from('support_tickets')
    .select('id, ticket_number, subject, category, priority, status, customer_type, related_transaction_reference, created_at, resolution_due_at')
    .eq('jurisdiction', manager.country)
    .not('status', 'in', '(RESOLVED,CLOSED)')
    .order('created_at', { ascending: false })
    .limit(100);

  const slaThreshold = Date.now() + 12 * 3600_000;
  const inbox = (inboxRows ?? []).map((t: any) => ({
    id: t.id,
    ticketNumber: t.ticket_number,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    customerType: t.customer_type,
    transactionReference: t.related_transaction_reference ?? null,
    createdAt: t.created_at,
    slaDueAt: t.resolution_due_at ?? null,
    slaAtRisk: t.resolution_due_at ? new Date(t.resolution_due_at).getTime() < slaThreshold : false,
  }));

  /* Escalations this manager filed (via their support_officers row). */
  let mine: any[] = [];
  if (manager.officerId) {
    const { data: escRows } = await admin
      .from('support_escalations')
      .select('id, escalation_number, ticket_id, reason, priority, destination, status, sla_due_at, created_at, resolved_at, support_tickets(ticket_number, subject, status, category)')
      .eq('created_by_officer_id', manager.officerId)
      .order('created_at', { ascending: false })
      .limit(100);
    mine = (escRows ?? []).map((e: any) => {
      const t = Array.isArray(e.support_tickets) ? e.support_tickets[0] : e.support_tickets;
      return {
        id: e.id,
        escalationNumber: e.escalation_number,
        destination: e.destination,
        priority: e.priority,
        status: e.status,
        reason: e.reason,
        slaDueAt: e.sla_due_at ?? null,
        createdAt: e.created_at,
        resolvedAt: e.resolved_at ?? null,
        ticket: t ? { number: t.ticket_number, subject: t.subject, status: t.status, category: t.category } : null,
      };
    });
  }

  return createSuccessResponse(
    {
      inbox,
      myEscalations: mine,
      counts: {
        openInbox: inbox.length,
        slaAtRisk: inbox.filter((t) => t.slaAtRisk).length,
        myOpen: mine.filter((e) => e.status !== 'RESOLVED' && e.status !== 'CLOSED').length,
      },
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
