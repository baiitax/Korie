import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/reconciliation
 *
 * The authenticated agent's own real end-of-day cash reconciliation history
 * (public.agent_cash_reconciliations).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('agent_cash_reconciliations')
    .select('*')
    .eq('agent_id', agent.agentId)
    .order('reconciliation_date', { ascending: false })
    .limit(60);

  if (error) {
    return createErrorResponse({ code: 'RECONCILIATION_LOOKUP_FAILED', message: 'Could not load reconciliation history.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    {
      reconciliations: (data || []).map((r: any) => ({
        id: r.id,
        reconciliation_date: r.reconciliation_date,
        currency: r.currency,
        opening_cash: Number(r.opening_cash),
        today_cash_in: Number(r.today_cash_in),
        today_cash_out: Number(r.today_cash_out),
        expected_closing_cash: Number(r.expected_closing_cash),
        actual_physical_cash: Number(r.actual_physical_cash),
        difference: Number(r.difference),
        status: r.status,
        notes: r.notes,
        submitted_at: r.submitted_at,
      })),
    },
    { code: 'RECONCILIATION_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}

/**
 * POST /api/v1/agency/reconciliation
 *
 * Submits today's real end-of-day cash count via
 * public.submit_agent_cash_reconciliation(), which derives opening cash and
 * today's cash-in/out volume from the agent's real transaction/ledger
 * history server-side — the client only supplies the physically-counted
 * cash amount and optional notes.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: agent.requestId, httpStatus: 400 });
  }

  const actualPhysicalCash = Number(body.actual_physical_cash);
  if (!Number.isFinite(actualPhysicalCash) || actualPhysicalCash < 0) {
    return createErrorResponse({ code: 'INVALID_AMOUNT', message: 'Enter a valid physically-counted cash amount.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { data, error } = await admin.rpc('submit_agent_cash_reconciliation', {
    p_agent_id: agent.agentId,
    p_actual_physical_cash: actualPhysicalCash,
    p_notes: body.notes || null,
  });

  if (error) {
    const message = error.message || '';
    if (message.includes('AGENT_FLOAT_NOT_PROVISIONED')) {
      return createErrorResponse({ code: 'AGENT_FLOAT_NOT_PROVISIONED', message: 'Your agent float account has not been provisioned yet. Contact support.', requestId: agent.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: 'RECONCILIATION_SUBMIT_FAILED', message: 'Could not submit reconciliation. Please try again.', requestId: agent.requestId, httpStatus: 500 });
  }

  const rec = data;

  return createSuccessResponse(
    {
      id: rec.id,
      reconciliation_date: rec.reconciliation_date,
      currency: rec.currency,
      opening_cash: Number(rec.opening_cash),
      today_cash_in: Number(rec.today_cash_in),
      today_cash_out: Number(rec.today_cash_out),
      expected_closing_cash: Number(rec.expected_closing_cash),
      actual_physical_cash: Number(rec.actual_physical_cash),
      difference: Number(rec.difference),
      status: rec.status,
      notes: rec.notes,
      submitted_at: rec.submitted_at,
    },
    { code: 'RECONCILIATION_SUBMITTED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
