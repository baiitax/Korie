import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/terminal
 *
 * The authenticated agent's own assigned POS terminal (public.agent_terminals,
 * auto-provisioned by trg_provision_agent_terminal whenever agents.terminal_id
 * is set). Distinct from /api/v1/agency/terminals, which is the ops-facing
 * fleet view backed by the in-memory TerminalManagementEngine.
 *
 * Battery level and signal strength are not simulated by hardware telemetry
 * (no real device SDK integration exists yet) — they are intentionally
 * omitted from the response rather than fabricated; the frontend shows
 * "Live" connectivity state (last_sync_at) instead of an invented percentage.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('agent_terminals')
    .select('*')
    .eq('agent_id', agent.agentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return createErrorResponse({ code: 'TERMINAL_LOOKUP_FAILED', message: 'Could not load your terminal.', requestId: agent.requestId, httpStatus: 500 });
  }

  if (!data) {
    return createErrorResponse({ code: 'TERMINAL_NOT_PROVISIONED', message: 'No terminal has been assigned to your account yet. Contact support.', requestId: agent.requestId, httpStatus: 404 });
  }

  return createSuccessResponse(
    {
      terminal_id: data.terminal_id,
      model: data.model,
      serial_number: data.serial_number,
      status: data.status,
      network_type: data.network_type,
      app_version: data.app_version,
      last_sync_at: data.last_sync_at,
    },
    { code: 'TERMINAL_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
