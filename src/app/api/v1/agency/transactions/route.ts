import { NextRequest } from 'next/server';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/agency/transactions
 *
 * Server-side paginated transaction history for the authenticated agent
 * ONLY (object-level authorization enforced via agent_id = authenticated
 * agent, never a client-supplied agent id). Does not download the entire
 * transaction table to the browser.
 *
 * Query params: limit (default 20, max 100), before (ISO timestamp cursor)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req);
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }

  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get('limit') || 20);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const before = url.searchParams.get('before');

  let query = admin
    .from('agency_transactions')
    .select('*')
    .eq('agent_id', agent.agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    return createErrorResponse({
      code: 'TRANSACTIONS_LOOKUP_FAILED',
      message: 'Could not load transaction history.',
      requestId: agent.requestId,
      httpStatus: 500,
    });
  }

  return createSuccessResponse(
    {
      transactions: (data || []).map((tx: any) => ({
        id: tx.id,
        reference: tx.reference,
        type: tx.transaction_type,
        amount: Number(tx.amount),
        customer_fee: Number(tx.customer_fee),
        agent_commission: Number(tx.agent_commission),
        currency: tx.currency,
        status: tx.status,
        customer_name: tx.customer_name,
        customer_phone: tx.customer_phone,
        customer_account: tx.customer_account,
        customer_bank: tx.customer_bank,
        created_at: tx.created_at,
        completed_at: tx.completed_at,
      })),
      next_cursor: data && data.length === limit ? data[data.length - 1].created_at : null,
    },
    {
      code: 'TRANSACTIONS_RETRIEVED',
      requestId: agent.requestId,
      environment: 'PRODUCTION',
    }
  );
}
