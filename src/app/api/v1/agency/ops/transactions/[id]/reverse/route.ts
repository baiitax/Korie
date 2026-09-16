import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/ops/transactions/:id/reverse
 *
 * Back-office endpoint (SUPER_ADMIN / AGENCY_OPS_ADMIN only) — the MAKER step
 * of the checked reversal flow (B8 / RISK-13, migration 20260914000059).
 * This route no longer reverses anything directly: it submits an
 * AGENCY_TRANSACTION_REVERSAL request into maker_checker_requests, and a
 * DIFFERENT authorized officer (ops or admin) must approve it through the
 * approvals surface before `reverse_agency_transaction` executes — inside
 * the checker's approval transaction. Self-approval is refused by the
 * database (MAKER_CHECKER_SELF_APPROVAL_FORBIDDEN).
 *
 * The eventual execution (unchanged RPC, migration 20260914000055):
 *  - inverts the original journal on every leg (money, fee, commission);
 *  - claws back the agent's commission (EARNED/PENDING_SETTLEMENT: the
 *    accrued payable inverts; PAID: the settled amount is recovered from the
 *    agent's wallet float, fail-closed on insufficient float);
 *  - marks the transaction REVERSED, links the reversal journal
 *    (reversal_ledger_transaction_id), and writes an audit event.
 *
 * A meaningful reason (min 20 chars) is required — the same standard as
 * adjustment journals — and is validated at submission and again at
 * execution. If the checker's approval fails (e.g. the transaction became
 * non-reversible meanwhile), the request stays PENDING and is safe to retry
 * or reject.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeOpsRequest(req, ['SUPER_ADMIN', 'AGENCY_OPS_ADMIN']);
  if (!auth.isAuthorized) {
    return createErrorResponse({
      code: auth.errorCode || 'FORBIDDEN',
      message: auth.errorMessage || 'Not authorized.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 403,
    });
  }

  const actorEmail = (auth as { email?: string }).email ?? 'agency-ops';
  const transactionId = params?.id;
  if (!transactionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
    return createErrorResponse({
      code: 'INVALID_TRANSACTION_ID',
      message: 'A valid transaction id is required.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    // handled below — reason is mandatory
  }
  const reason = (body.reason ?? '').trim();
  if (reason.length < 20) {
    return createErrorResponse({
      code: 'REVERSAL_REASON_REQUIRED',
      message: 'A meaningful reversal reason is required (at least 20 characters).',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc('submit_money_movement_request', {
    p_action_type: 'AGENCY_TRANSACTION_REVERSAL',
    p_payload: { transaction_id: transactionId, reason },
    p_maker_id: auth.userId ?? null,
    p_maker_email: actorEmail,
    p_maker_role: auth.roleName || 'AGENCY_OPS_ADMIN',
    p_maker_notes: 'Reversal requested from the ops console',
  });

  if (error) {
    const message = error.message || '';
    const notFound = message.includes('MAKER_CHECKER_INVALID_TRANSACTION');
    return createErrorResponse({
      code: notFound
        ? 'AGENCY_TRANSACTION_NOT_FOUND'
        : message.includes('REVERSAL_REASON_REQUIRED')
          ? 'REVERSAL_REASON_REQUIRED'
          : 'REVERSAL_REQUEST_FAILED',
      message: message || 'The reversal request did not complete.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: notFound ? 404 : message.includes('REVERSAL_REASON_REQUIRED') ? 400 : 500,
    });
  }

  const rec = (data ?? {}) as Record<string, unknown>;
  return createSuccessResponse(
    {
      request: {
        id: rec?.id,
        action_type: rec?.action_type,
        status: rec?.status,
        payload: rec?.payload,
        submitted_by: rec?.maker_email,
        submitted_at: rec?.created_at,
      },
      note: 'Reversal submitted for checker approval. A DIFFERENT authorized officer must approve it in the approvals queue before the journal is inverted — self-approval is refused by the database.',
    },
    { code: 'REVERSAL_SUBMITTED_FOR_CHECKER_APPROVAL', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
