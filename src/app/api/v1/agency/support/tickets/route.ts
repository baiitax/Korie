import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const ALLOWED_CATEGORIES = ['TRANSACTION_DISPUTE', 'FLOAT_ISSUE', 'TERMINAL_ISSUE', 'KYC_ISSUE', 'OTHER'];

/**
 * GET /api/v1/agency/support/tickets — the authenticated agent's own real
 * support/dispute tickets.
 * POST /api/v1/agency/support/tickets — opens a new ticket, optionally
 * linked to a specific agency_transactions row the agent owns (verified via
 * an ownership check, never trusted from the client blindly).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('agent_support_tickets')
    .select('*')
    .eq('agent_id', agent.agentId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'TICKETS_LOOKUP_FAILED', message: 'Could not load support tickets.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ tickets: data || [] }, { code: 'TICKETS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { category, subject, description, related_transaction_id, priority } = body;

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return createErrorResponse({ code: 'INVALID_CATEGORY', message: 'Unsupported ticket category.', requestId: agent.requestId, httpStatus: 400 });
  }
  if (!subject || !description) {
    return createErrorResponse({ code: 'MISSING_FIELDS', message: 'Subject and description are required.', requestId: agent.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  if (related_transaction_id) {
    const { data: tx } = await admin
      .from('agency_transactions')
      .select('id')
      .eq('id', related_transaction_id)
      .eq('agent_id', agent.agentId)
      .maybeSingle();

    if (!tx) {
      return createErrorResponse({ code: 'TRANSACTION_NOT_FOUND', message: 'The referenced transaction does not belong to your account.', requestId: agent.requestId, httpStatus: 403 });
    }
  }

  const { data, error } = await admin
    .from('agent_support_tickets')
    .insert({
      agent_id: agent.agentId,
      category,
      related_transaction_id: related_transaction_id || null,
      subject,
      description,
      priority: ['P1', 'P2', 'P3'].includes(priority) ? priority : 'P2',
      status: 'OPEN',
    })
    .select()
    .single();

  if (error) {
    return createErrorResponse({ code: 'TICKET_CREATE_FAILED', message: 'Could not open ticket.', requestId: agent.requestId, httpStatus: 500 });
  }

  await admin.from('agent_support_ticket_messages').insert({
    ticket_id: data.id,
    sender_type: 'AGENT',
    sender_id: agent.authUserId,
    message: description,
  });

  return createSuccessResponse(
    { id: data.id, status: data.status, created_at: data.created_at },
    { code: 'TICKET_CREATED', message: 'Support ticket opened.', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
