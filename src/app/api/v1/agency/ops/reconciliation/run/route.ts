import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/ops/reconciliation/run
 *
 * Back-office endpoint (AGENCY_OPS_ADMIN / SUPER_ADMIN only) that triggers
 * public.run_aggregator_reconciliation(p_reconciliation_date, p_run_by).
 * The function is idempotent per (aggregator, date, currency) and never
 * reopens a row an investigator has RESOLVED, so re-running a day is safe.
 *
 * Semantics (migration 000056 — the F17 lesson):
 *   - no ledger movement and no bank statement -> nothing written (a
 *     zero-total day never asserts MATCHED);
 *   - ledger movement with no ingested statement -> PENDING_REVIEW row
 *     (bank_settled_total stays NULL — "no data", not "bank said zero");
 *   - both sides computed and equal -> MATCHED; unequal -> MISMATCH with
 *     variance; bank activity with silent books -> MISSING.
 *
 * Optional body: { "date": "YYYY-MM-DD" } to (re)run a past date — e.g. to
 * backfill after bank statements are ingested for that day. Defaults to
 * today. The nightly financial-close cron calls the same function before
 * the close, so this route is for on-demand ops/auditors, not the schedule.
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

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // body is optional; defaults below apply
  }

  const date = body.date || new Date().toISOString().slice(0, 10);
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return createErrorResponse({
      code: 'INVALID_DATE',
      message: 'date must be formatted as YYYY-MM-DD.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc('run_aggregator_reconciliation', {
    p_reconciliation_date: date,
    p_run_by: (auth as { email?: string }).email || 'agency-ops',
  });

  if (error) {
    return createErrorResponse({
      code: 'AGGREGATOR_RECONCILIATION_RUN_FAILED',
      message: error.message || 'Aggregator reconciliation run failed.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: 500,
    });
  }

  return createSuccessResponse(
    {
      reconciliation_date: (data as Record<string, unknown>)?.reconciliation_date ?? date,
      rows_written: (data as Record<string, unknown>)?.rows_written ?? 0,
      matched: (data as Record<string, unknown>)?.matched ?? 0,
      pending_review: (data as Record<string, unknown>)?.pending_review ?? 0,
      mismatch: (data as Record<string, unknown>)?.mismatch ?? 0,
      missing: (data as Record<string, unknown>)?.missing ?? 0,
      skipped_no_activity: (data as Record<string, unknown>)?.skipped_no_activity ?? 0,
    },
    { code: 'AGGREGATOR_RECONCILIATION_RUN_COMPLETE', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
  );
}
