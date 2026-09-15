import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/financial-close
 *
 * Scheduled entry point for the automated daily financial close (blocker B9).
 * First runs `run_aggregator_reconciliation(p_reconciliation_date)` so the
 * day's aggregator recon rows exist (honest statuses: MATCHED computed from
 * both sides, PENDING_REVIEW when a bank statement has not been ingested),
 * then runs `run_daily_financial_close(p_close_date, p_closed_by)` on the
 * ledger, which verifies the accounting equation per currency, checks
 * balance drift / wallet sync / custodial floors / clearing ageing /
 * commission ageing / orphan journals / aggregator recon exceptions, and
 * writes (idempotently) a row into daily_financial_closes with a full
 * metrics breakdown.
 *
 * Schedule (vercel.json): 0 22 * * * — 22:00 UTC = 23:00 WAT, so the close
 * captures the full West-Africa day before midnight.
 *
 * Auth: the `x-cron-secret` header (or Authorization: Bearer CRON_SECRET)
 * must match the CRON_SECRET environment variable. Without the variable
 * configured the endpoint refuses to run — it never opens unauthenticated.
 *
 * Optional query: ?date=YYYY-MM-DD to (re)run the recon + close for a past
 * date — both functions are idempotent per date (the recon upserts per
 * aggregator/currency; the close is delete-then-insert per date), so
 * re-running a day simply refreshes that day's rows. A recon row already
 * RESOLVED by an investigator is never reopened.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { status: "error", error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET is not set; scheduled financial close is disabled." } },
      { status: 503 },
    );
  }
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json(
      { status: "error", error: { code: "UNAUTHORIZED", message: "Invalid cron secret." } },
      { status: 401 },
    );
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  let closeDate: string;
  if (dateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { status: "error", error: { code: "INVALID_DATE", message: "date must be formatted as YYYY-MM-DD." } },
        { status: 400 },
      );
    }
    closeDate = dateParam;
  } else {
    closeDate = new Date().toISOString().slice(0, 10);
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "ACCOUNTING_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  try {
    // Reconcile first: the close must see the day's aggregator recon rows so
    // aged PENDING_REVIEW / open MISMATCH items count as exceptions.
    const { error: reconError } = await admin.rpc("run_aggregator_reconciliation", {
      p_reconciliation_date: closeDate,
      p_run_by: "cron",
    });
    if (reconError) throw reconError;

    const { data: close, error } = await admin.rpc("run_daily_financial_close", {
      p_close_date: closeDate,
      p_closed_by: "cron",
    });
    if (error) throw error;
    return NextResponse.json({ status: "ok", close });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: { code: "CLOSE_FAILED", message: err instanceof Error ? err.message : "The financial close did not complete." } },
      { status: 500 },
    );
  }
}
