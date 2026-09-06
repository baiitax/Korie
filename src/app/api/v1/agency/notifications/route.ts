import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/notifications — the authenticated agent's own real
 * notification feed (populated by the trg_notify_agent_on_transaction
 * trigger and any future ops-authored notices — never client-fabricated).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 30), 1), 100);

  const { data, error } = await admin
    .from('agent_notifications')
    .select('*')
    .eq('agent_id', agent.agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return createErrorResponse({ code: 'NOTIFICATIONS_LOOKUP_FAILED', message: 'Could not load notifications.', requestId: agent.requestId, httpStatus: 500 });
  }

  const { count: unreadCount } = await admin
    .from('agent_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agent.agentId)
    .eq('is_read', false);

  return createSuccessResponse(
    { notifications: data || [], unread_count: unreadCount || 0 },
    { code: 'NOTIFICATIONS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}

/**
 * PATCH /api/v1/agency/notifications — marks one or all notifications read
 * for the authenticated agent only (object-level scoping enforced by the
 * agent_id filter, never a client-supplied id list without ownership check).
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body to mean "mark all read"
  }

  let query = admin
    .from('agent_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('agent_id', agent.agentId)
    .eq('is_read', false);

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    query = query.in('id', body.ids);
  }

  const { error } = await query;

  if (error) {
    return createErrorResponse({ code: 'NOTIFICATIONS_UPDATE_FAILED', message: 'Could not mark notifications as read.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ updated: true }, { code: 'NOTIFICATIONS_MARKED_READ', requestId: agent.requestId, environment: 'PRODUCTION' });
}
