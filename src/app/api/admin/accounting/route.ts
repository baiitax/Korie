import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminMfaForMutation } from "@/lib/security/adminMfa";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/accounting?view=trial-balance[&asOf=YYYY-MM-DD]
 *      /api/admin/accounting?view=closes[&limit=60]
 * POST /api/admin/accounting  { date?: "YYYY-MM-DD" }
 *
 * Real, ledger-backed accounting operations for the admin portal:
 *  - trial-balance: generate_trial_balance() — per-account stored vs
 *    journal-derived balances and debit/credit volumes, with per-currency
 *    summaries. Backed by the enforced double-entry ledger.
 *  - closes: daily_financial_closes history — the output of the automated
 *    daily close (blocker B9), including exception metrics.
 *  - POST runs run_daily_financial_close(date, actor) — the sanctioned
 *    operator path for re-running a day's close (idempotent per date; the
 *    function itself writes an audit_events row). The scheduled cron at
 *    /api/cron/financial-close does the same thing nightly.
 *
 * There is no simulated engine behind these numbers: every figure comes from
 * the production ledger via SECURITY DEFINER functions or direct table reads.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request, ADMIN_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
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

  const view = request.nextUrl.searchParams.get("view") ?? "trial-balance";

  try {
    if (view === "trial-balance") {
      const asOf = request.nextUrl.searchParams.get("asOf");
      if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
        return NextResponse.json(
          { status: "error", error: { code: "INVALID_DATE", message: "asOf must be formatted as YYYY-MM-DD." } },
          { status: 400 },
        );
      }
      const { data: rows, error } = await admin.rpc("generate_trial_balance", asOf ? { p_as_of: asOf } : {});
      if (error) throw error;

      // Per-currency summaries from the trial balance rows.
      const byCurrency: Record<
        string,
        { accounts: number; consistent: number; debitVolume: number; creditVolume: number; balanced: boolean }
      > = {};
      for (const r of rows ?? []) {
        const c = (byCurrency[r.currency] ??= {
          accounts: 0,
          consistent: 0,
          debitVolume: 0,
          creditVolume: 0,
          balanced: true,
        });
        c.accounts += 1;
        if (r.is_consistent) c.consistent += 1;
        c.debitVolume += Number(r.debit_volume ?? 0);
        c.creditVolume += Number(r.credit_volume ?? 0);
        c.balanced = c.debitVolume === c.creditVolume;
      }
      return NextResponse.json({
        status: "ok",
        asOf: asOf ?? null,
        currencies: byCurrency,
        rows: rows ?? [],
      });
    }

    if (view === "closes") {
      const limitRaw = request.nextUrl.searchParams.get("limit");
      const limit = Math.min(Math.max(parseInt(limitRaw ?? "60", 10) || 60, 1), 200);
      const { data: closes, error } = await admin
        .from("daily_financial_closes")
        .select("*")
        .order("close_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({ status: "ok", closes: closes ?? [] });
    }

    return NextResponse.json(
      { status: "error", error: { code: "UNKNOWN_VIEW", message: `Unknown view "${view}" — use trial-balance or closes.` } },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: { code: "ACCOUNTING_VIEW_FAILED", message: err instanceof Error ? err.message : "The accounting view did not load." } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request, ADMIN_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
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

  // MFA/AAL enforcement (ADMIN_PORTAL_REVIEW.md finding #2): closing the
  // books is a money-movement-adjacent action, so it requires a verified
  // TOTP factor, unconditionally, unless this account predates the
  // enforcement cutoff (soft launch — see adminMfa.ts).
  const mfaCheck = await requireAdminMfaForMutation(admin, auth);
  if (!mfaCheck.ok) return mfaCheck.response;

  let body: { date?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let closeDate: string;
  if (body.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { status: "error", error: { code: "INVALID_DATE", message: "date must be formatted as YYYY-MM-DD." } },
        { status: 400 },
      );
    }
    closeDate = body.date;
  } else {
    closeDate = new Date().toISOString().slice(0, 10);
  }

  // Attribute the operator-triggered close to the authenticated admin. The
  // close function itself records an audit_events row.
  const closedBy = (auth as { email?: string }).email ?? "admin-console";

  try {
    const { data: close, error } = await admin.rpc("run_daily_financial_close", {
      p_close_date: closeDate,
      p_closed_by: closedBy,
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
