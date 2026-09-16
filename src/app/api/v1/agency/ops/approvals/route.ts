import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { decideMoneyMovement } from '@/lib/security/moneyMovement';

/**
 * GET  /api/v1/agency/ops/approvals
 * POST /api/v1/agency/ops/approvals
 *
 * The CHECKER surface for money-movement requests (B8 / RISK-13, migration
 * 20260914000059): settlement runs and transaction reversals submitted by
 * any maker surface (ops console, aggregator portal, merchant portal).
 *
 * AGENCY_OPS_ADMIN is deliberately NOT in ADMIN_ROLES, so ops checkers
 * cannot use /api/admin/approvals — this dedicated route gives them the
 * same decide capability through the same RPC, with the same database
 * guards: PENDING-only, no self-approval, execution inside the approval
 * transaction (a failed run/reversal rolls the approval back and the
 * request stays PENDING).
 */

const MONEY_MOVEMENT_TYPES = ['AGENCY_SETTLEMENT_RUN', 'MERCHANT_SETTLEMENT_RUN', 'AGENCY_TRANSACTION_REVERSAL'];

export async function GET(req: NextRequest) {
  const auth = await authorizeOpsRequest(req, ['SUPER_ADMIN', 'AGENCY_OPS_ADMIN']);
  if (!auth.isAuthorized) {
    return createErrorResponse({
      code: auth.errorCode || 'FORBIDDEN',
      message: auth.errorMessage || 'Not authorized.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 403,
    });
  }

  const admin = getSupabaseAdminClient();
  const { data: requests, error } = await admin
    .from('maker_checker_requests')
    .select('id, action_type, status, maker_email, maker_role, maker_notes, payload, checker_email, checker_notes, execution_result, created_at, approved_at, rejected_at, executed_at')
    .in('action_type', MONEY_MOVEMENT_TYPES)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return createErrorResponse({ code: 'APPROVALS_QUEUE_UNAVAILABLE', message: 'Could not load the approvals queue.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  // Enrich with display context resolved from the payload (org / merchant /
  // transaction references) so the checker sees WHAT they are approving.
  const orgIds = new Set<string>();
  const merchantIds = new Set<string>();
  const txnIds = new Set<string>();
  for (const r of requests ?? []) {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    if (typeof p.org_id === 'string') orgIds.add(p.org_id);
    if (typeof p.merchant_id === 'string') merchantIds.add(p.merchant_id);
    if (typeof p.transaction_id === 'string') txnIds.add(p.transaction_id);
  }

  const [orgs, merchants, txns] = await Promise.all([
    orgIds.size
      ? admin.from('organizations').select('id, name').in('id', Array.from(orgIds))
      : Promise.resolve({ data: [] as any[] }),
    merchantIds.size
      ? admin.from('merchant_profiles').select('id, business_name').in('id', Array.from(merchantIds))
      : Promise.resolve({ data: [] as any[] }),
    txnIds.size
      ? admin.from('agency_transactions').select('id, reference, amount, currency, status, customer_name, created_at').in('id', Array.from(txnIds))
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const orgNames = new Map<string, string>((orgs.data ?? []).map((o: any) => [o.id, o.name]));
  const merchantNames = new Map<string, string>((merchants.data ?? []).map((m: any) => [m.id, m.business_name]));
  const txnMap = new Map<string, any>((txns.data ?? []).map((t: any) => [t.id, t]));

  const enriched = (requests ?? []).map((r: any) => {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    const orgId = typeof p.org_id === "string" ? p.org_id : null;
    const merchantId = typeof p.merchant_id === "string" ? p.merchant_id : null;
    const transactionId = typeof p.transaction_id === "string" ? p.transaction_id : null;
    return {
      id: r.id,
      action_type: r.action_type,
      status: r.status,
      maker_email: r.maker_email,
      maker_role: r.maker_role,
      maker_notes: r.maker_notes,
      payload: r.payload,
      checker_email: r.checker_email,
      checker_notes: r.checker_notes,
      execution_result: r.execution_result,
      created_at: r.created_at,
      approved_at: r.approved_at,
      rejected_at: r.rejected_at,
      executed_at: r.executed_at,
      context: {
        org_name: orgId ? orgNames.get(orgId) ?? null : null,
        merchant_name: merchantId ? merchantNames.get(merchantId) ?? null : null,
        transaction: transactionId ? txnMap.get(transactionId) ?? null : null,
      },
    };
  });

  const pending = enriched.filter((r: any) => r.status === 'PENDING');

  return createSuccessResponse(
    {
      requests: enriched,
      pending_count: pending.length,
      can_decide_as: (auth as { email?: string }).email ?? 'agency-ops',
      note: 'Approving executes the underlying settlement run or reversal inside the approval transaction. Self-approval is refused by the database.',
    },
    { code: 'MONEY_MOVEMENT_APPROVALS_LOADED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}

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

  let body: { request_id?: string; decision?: string; notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    // handled below
  }

  const requestId = (body.request_id ?? '').trim();
  const decision = (body.decision ?? '').trim().toUpperCase();
  const notes = (body.notes ?? '').trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return createErrorResponse({ code: 'INVALID_REQUEST_ID', message: 'A valid request_id is required.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (decision !== 'APPROVE' && decision !== 'REJECT') {
    return createErrorResponse({ code: 'INVALID_DECISION', message: 'decision must be APPROVE or REJECT.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }
  if (notes.length < 10) {
    return createErrorResponse({ code: 'DECISION_NOTES_REQUIRED', message: 'A meaningful note (at least 10 characters) is required for the audit trail.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const decided = await decideMoneyMovement({
    requestId,
    checkerId: auth.userId ?? null,
    checkerEmail: actorEmail,
    decision,
    notes,
  });

  if (!decided.ok) {
    return createErrorResponse({
      code: decided.code,
      message: decided.message,
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: decided.httpStatus,
    });
  }

  return createSuccessResponse(
    {
      request_id: decided.result.request_id,
      action_type: decided.result.action_type,
      status: decided.result.status,
      execution_result: decided.result.execution_result,
      decided_by: actorEmail,
      note:
        decided.result.status === 'EXECUTED'
          ? 'Approved and executed inside the approval transaction.'
          : 'Rejected. Nothing was executed.',
    },
    { code: decided.result.status === 'EXECUTED' ? 'MONEY_MOVEMENT_REQUEST_EXECUTED' : 'MONEY_MOVEMENT_REQUEST_REJECTED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
