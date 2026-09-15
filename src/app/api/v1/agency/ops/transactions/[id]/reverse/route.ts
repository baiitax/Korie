import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/ops/transactions/:id/reverse
 *
 * Back-office endpoint (SUPER_ADMIN / AGENCY_OPS_ADMIN only) that reverses a
 * SUCCESSFUL agency transaction through `reverse_agency_transaction` — the
 * sanctioned path (migration 20260914000055).
 *
 * Inside a single DB transaction the RPC:
 *  - inverts the original journal on every leg (money, fee, commission);
 *  - claws back the agent's commission (EARNED/PENDING_SETTLEMENT: the
 *    accrued payable inverts; PAID: the settled amount is recovered from the
 *    agent's wallet float, fail-closed on insufficient float);
 *  - marks the transaction REVERSED and the commission CLAWED_BACK with
 *    attribution, and writes an audit event.
 *
 * Idempotent: a transaction reverses exactly once. A meaningful reason
 * (min 20 chars) is required — the same standard as adjustment journals.
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
  const { data, error } = await admin.rpc('reverse_agency_transaction', {
    p_transaction_id: transactionId,
    p_reversed_by: actorEmail,
    p_reason: reason,
  });

  if (error) {
    const message = error.message || '';
    const conflict =
      message.includes('AGENCY_TRANSACTION_ALREADY_REVERSED') ||
      message.includes('AGENCY_TRANSACTION_NOT_REVERSIBLE') ||
      message.includes('AGENT_FLOAT_INSUFFICIENT_FOR_CLAWBACK') ||
      message.includes('JOURNAL_SHAPE_UNEXPECTED');
    const notFound = message.includes('AGENCY_TRANSACTION_NOT_FOUND');
    return createErrorResponse({
      code: conflict
        ? 'REVERSAL_CONFLICT'
        : notFound
          ? 'AGENCY_TRANSACTION_NOT_FOUND'
          : message.includes('REVERSAL_REASON_REQUIRED')
            ? 'REVERSAL_REASON_REQUIRED'
            : 'REVERSAL_FAILED',
      message: message || 'The reversal did not complete.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: conflict ? 409 : notFound ? 404 : message.includes('REVERSAL_REASON_REQUIRED') ? 400 : 500,
    });
  }

  const rec = data as Record<string, unknown>;
  return createSuccessResponse(
    {
      transaction: {
        id: rec?.id,
        reference: rec?.reference,
        status: rec?.status,
        amount: Number(rec?.amount ?? 0),
        customer_fee: Number(rec?.customer_fee ?? 0),
        agent_commission: Number(rec?.agent_commission ?? 0),
        currency: rec?.currency,
      },
      note: 'Journal inverted and commission clawed back. If the commission had been settled, it was recovered from the agent float.',
    },
    { code: 'AGENCY_TRANSACTION_REVERSED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
