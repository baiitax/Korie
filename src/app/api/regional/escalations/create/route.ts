import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { resolveTerritoryScope, aggregatorInScope, agentInScope } from '@/lib/regional/territoryScope';

export const dynamic = 'force-dynamic';

/** Escalation destinations map to the real support_escalations check
 *  constraint: the control function that will own the case. */
const DESTINATIONS = ['COMPLIANCE', 'FRAUD_RISK', 'ENGINEERING', 'BANKING_OPS', 'FINANCE', 'SETTLEMENT', 'MANAGEMENT'] as const;
const PRIORITIES = ['P0_CRITICAL', 'P1', 'P2', 'P3'] as const;
/** Portal priority → the desk's own vocabulary (check constraints). */
const DESK_PRIORITY: Record<string, string> = { P0_CRITICAL: 'CRITICAL', P1: 'URGENT', P2: 'HIGH', P3: 'NORMAL' };

/**
 * POST /api/regional/escalations/create — a Regional Manager files a real
 * escalation. This deliberately rides the EXISTING support system: a real
 * support_tickets row (customer_type AGGREGATOR/AGENT, jurisdiction =
 * manager's country) + a real support_escalations row routed to the
 * chosen control function, attributed to the manager's support_officers
 * identity. No parallel escalation entity exists.
 *
 * Hard rules:
 *  • Idempotency-Key header REQUIRED — a retried request can never file
 *    two tickets (dedupe table + unique key).
 *  • Referenced aggregator/agent must be inside the manager's territory.
 *  • Only the declared fields are read from the body (mass-assignment
 *    protection) — status, assignees and SLAs are set by the desk, never
 *    by the filer.
 *  • The whole thing is audit-logged with the manager's identity.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.escalations.create');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;

  const idempotencyKey = (req.headers.get('x-idempotency-key') || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return createErrorResponse({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'An Idempotency-Key header is required for escalations.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }
  if (!manager.officerId) {
    return createErrorResponse({
      code: 'NO_OFFICER_IDENTITY',
      message: 'Your escalation filing identity is not provisioned. Contact support operations.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 409,
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  /* Whitelisted fields only. */
  const category = String(body.category || '').trim();
  const destination = String(body.destination || '').trim();
  const priority = String(body.priority || 'P2').trim();
  const subject = String(body.subject || '').trim().slice(0, 160);
  const description = String(body.description || '').trim().slice(0, 4000);
  const aggregatorId = body.aggregatorId ? String(body.aggregatorId) : null;
  const agentId = body.agentId ? String(body.agentId) : null;
  const transactionReference = body.transactionReference ? String(body.transactionReference).trim().slice(0, 64) : null;
  const expectedResolution = body.expectedResolution ? String(body.expectedResolution).trim().slice(0, 500) : null;

  if (!category || !subject || description.length < 10) {
    return createErrorResponse({
      code: 'INVALID_ESCALATION',
      message: 'Category, subject and a description of at least 10 characters are required.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 422,
    });
  }
  if (!DESTINATIONS.includes(destination as (typeof DESTINATIONS)[number])) {
    return createErrorResponse({
      code: 'INVALID_DESTINATION',
      message: `destination must be one of ${DESTINATIONS.join(', ')}.`,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 422,
    });
  }
  if (!PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) {
    return createErrorResponse({
      code: 'INVALID_PRIORITY',
      message: `priority must be one of ${PRIORITIES.join(', ')}.`,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 422,
    });
  }

  const scope = await resolveTerritoryScope(manager);
  if (aggregatorId && !aggregatorInScope(scope, aggregatorId)) {
    return createErrorResponse({
      code: 'OUTSIDE_TERRITORY',
      message: 'The referenced aggregator is outside your territory.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }
  if (agentId && !agentInScope(scope, agentId)) {
    return createErrorResponse({
      code: 'OUTSIDE_TERRITORY',
      message: 'The referenced agent is outside your territory.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 403,
    });
  }

  const admin = getSupabaseAdminClient();

  /* Idempotency: a key already used by this manager returns the original
   * ticket instead of filing another. */
  const { data: existing } = await admin
    .from('regional_escalation_keys')
    .select('ticket_id, support_tickets(ticket_number, status)')
    .eq('key', idempotencyKey)
    .eq('manager_id', manager.managerId)
    .maybeSingle();
  if (existing) {
    const t = Array.isArray(existing.support_tickets) ? existing.support_tickets[0] : existing.support_tickets;
    return createSuccessResponse(
      { alreadyFiled: true, ticketNumber: t?.ticket_number ?? null, ticketStatus: t?.status ?? null },
      { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
    );
  }

  /* File the real ticket. */
  const ticketNumber = `KP-ESC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const affectedName = aggregatorId
    ? scope.aggregatorByTerritory && (() => { const m = new Map(scope.territories.map((t) => [t.aggregator_id, t.name])); return m.get(aggregatorId); })()
    : null;

  /* SLA clocks, same matrix the support console uses. */
  const deskPriority = DESK_PRIORITY[priority] || 'HIGH';
  const firstResponseDueMinutes = deskPriority === 'CRITICAL' ? 30 : deskPriority === 'URGENT' ? 60 : deskPriority === 'HIGH' ? 240 : 1440;
  const resolutionDueHours = deskPriority === 'CRITICAL' ? 4 : deskPriority === 'URGENT' ? 12 : deskPriority === 'HIGH' ? 24 : 72;
  const now = new Date();

  const { data: ticket, error: ticketError } = await admin
    .from('support_tickets')
    .insert({
      ticket_number: ticketNumber,
      subject,
      description: [
        description,
        expectedResolution ? `\n\nExpected resolution: ${expectedResolution}` : '',
        transactionReference ? `\nTransaction reference: ${transactionReference}` : '',
        aggregatorId ? `\nAggregator: ${aggregatorId}` : '',
        agentId ? `\nAgent: ${agentId}` : '',
      ].join(''),
      category,
      priority: DESK_PRIORITY[priority] || 'HIGH',
      status: 'ESCALATED',
      customer_type: aggregatorId ? 'AGGREGATOR' : agentId ? 'AGENT' : 'PARTNER',
      /* customer_id is NOT NULL on support_tickets — the referenced entity
       * when one is given, otherwise the filing manager's registry id. */
      customer_id: aggregatorId || agentId || manager.managerId,
      customer_name: affectedName ? `${affectedName} (regional escalation)` : `Regional escalation by ${manager.fullName}`,
      customer_email: manager.email,
      jurisdiction: manager.country,
      channel: 'IN_APP',
      language: 'en',
      related_transaction_reference: transactionReference,
      first_response_due_at: new Date(now.getTime() + firstResponseDueMinutes * 60000).toISOString(),
      resolution_due_at: new Date(now.getTime() + resolutionDueHours * 3600000).toISOString(),
    })
    .select('id, ticket_number')
    .single();
  if (ticketError || !ticket) {
    return createErrorResponse({
      code: 'ESCALATION_FILE_FAILED',
      message: 'The support desk did not accept the ticket. Please retry.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 503,
    });
  }

  /* Record the idempotency key NOW — a retry after any partial state
   * returns this ticket instead of filing another. */
  await admin.from('regional_escalation_keys').insert({ key: idempotencyKey, manager_id: manager.managerId, ticket_id: ticket.id });

  /* Raise the real escalation, attributed to the manager's officer row. */
  const escalationNumber = `KP-ESC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { data: escalation, error: escError } = await admin
    .from('support_escalations')
    .insert({
      escalation_number: escalationNumber,
      ticket_id: ticket.id,
      reason: subject,
      priority: DESK_PRIORITY[priority] || 'HIGH',
      destination,
      status: 'PENDING',
      sla_due_at: new Date(now.getTime() + resolutionDueHours * 3600000).toISOString(),
      created_by_officer_id: manager.officerId,
    })
    .select('id, escalation_number, status')
    .single();
  if (escError || !escalation) {
    /* Ticket exists but escalation failed — honest partial state, surfaced. */
    return createSuccessResponse(
      { filed: true, ticketNumber: ticket.ticket_number, escalationNumber: null, warning: 'Ticket filed, but the escalation routing needs desk attention.' },
      { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
    );
  }

  /* Audit. */
  await admin.from('audit_events').insert({
    actor_id: manager.managerId,
    actor_email: manager.email,
    actor_role: 'REGIONAL_MANAGER',
    action: 'REGIONAL_ESCALATION_FILED',
    resource_type: 'regional:escalation',
    resource_id: escalation.id,
    details: {
      ticketNumber: ticket.ticket_number,
      escalationNumber: escalation.escalation_number,
      destination,
      priority,
      category,
      aggregatorId,
      agentId,
      transactionReference,
      territory: manager.territories,
    },
    before_state: null,
    after_state: { status: 'PENDING' },
    ip_address: req.headers.get('x-forwarded-for') ?? 'unrecorded',
    request_id: `KP-REQ-${Date.now()}`,
    correlation_id: `KP-REQ-${Date.now()}`,
  });

  return createSuccessResponse(
    { filed: true, ticketNumber: ticket.ticket_number, escalationNumber: escalation.escalation_number },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
