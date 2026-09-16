import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { submitMoneyMovement } from '@/lib/security/moneyMovement';

/**
 * POST /api/v1/agency/ops/settlements/run
 *
 * Back-office endpoint (AGENCY_OPS_ADMIN / SUPER_ADMIN only) — the MAKER
 * step of the checked settlement flow (B8 / RISK-13, migration
 * 20260914000059). This route no longer runs the settlement directly: it
 * submits an AGENCY_SETTLEMENT_RUN request into maker_checker_requests,
 * and a DIFFERENT authorized officer must approve it before
 * run_daily_settlement() executes inside the approval transaction.
 * Self-approval is refused by the database.
 *
 * Since this Supabase project's plan does not have pg_cron enabled
 * (verified at migration time), this on-demand endpoint IS the settlement
 * trigger — it is expected to be called once per business day. The
 * underlying function remains idempotent per (org, currency, date).
 */
export async function POST(req: NextRequest) {
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

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // body is optional; defaults below apply
  }

  const orgId = body.org_id;
  const currency = body.currency;

  if (!orgId || !currency) {
    return createErrorResponse({ code: 'MISSING_PARAMETERS', message: 'org_id and currency are required.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const submitted = await submitMoneyMovement({
    actionType: 'AGENCY_SETTLEMENT_RUN',
    payload: {
      org_id: String(orgId),
      currency: String(currency).toUpperCase(),
      ...(body.settlement_date ? { settlement_date: String(body.settlement_date) } : {}),
    },
    makerId: auth.userId ?? null,
    makerEmail: actorEmail,
    makerRole: auth.roleName || 'AGENCY_OPS_ADMIN',
    makerNotes: 'Settlement run requested from the ops console',
  });

  if (!submitted.ok) {
    return createErrorResponse({
      code: submitted.code,
      message: submitted.message,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: submitted.httpStatus,
    });
  }

  const rec = submitted.request;
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
      note: 'Settlement run submitted for checker approval. A DIFFERENT authorized officer must approve it in the approvals queue before the batch posts — self-approval is refused by the database.',
    },
    { code: 'SETTLEMENT_RUN_SUBMITTED_FOR_CHECKER_APPROVAL', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
  );
}
