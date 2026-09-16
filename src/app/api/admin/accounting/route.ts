import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/accounting?view=trial-balance[&asOf=YYYY-MM-DD]
 *      /api/admin/accounting?view=closes[&limit=60]
 *      /api/admin/accounting?view=month-end-close
 * POST /api/admin/accounting  { date?: "YYYY-MM-DD" }
 *                              | { action: "month-end-close", step: "run-item"|"prepare"|"review", ... }
 *
 * Real, ledger-backed accounting operations for the admin portal:
 *  - trial-balance: generate_trial_balance() — per-account stored vs
 *    journal-derived balances and debit/credit volumes, with per-currency
 *    summaries. Backed by the enforced double-entry ledger.
 *  - closes: daily_financial_closes history — the output of the automated
 *    daily close (blocker B9), including exception metrics.
 *  - month-end-close: the five-reconciliation month-end checklist (bank rec,
 *    liability rec, revenue rec, commission rec, suspense review) with
 *    four-eyes prepare/review (migration 20260914000060).
 *  - POST runs run_daily_financial_close(date, actor) — the sanctioned
 *    operator path for re-running a day's close (idempotent per date; the
 *    function itself writes an audit_events row). The scheduled cron at
 *    /api/cron/financial-close does the same thing nightly.
 *  - POST with action=month-end-close drives the checklist: run-item computes
 *    one reconciliation for real, prepare is the maker step (all items
 *    performed, daily-close coverage, consistent trial balance), review is
 *    the checker step (a different person; APPROVE closes the period,
 *    REJECT returns it to OPEN).
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

    if (view === "month-end-close") {
      const { data: checklists, error } = await admin
        .from("month_end_close_checklists")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      const ids = (checklists ?? []).map((c: any) => c.id);
      const { data: items } = ids.length
        ? await admin.from("month_end_close_items").select("*").in("checklist_id", ids)
        : { data: [] as any[] };
      const byChecklist = new Map<string, any[]>();
      for (const it of items ?? []) {
        const list = byChecklist.get(it.checklist_id) ?? [];
        list.push(it);
        byChecklist.set(it.checklist_id, list);
      }
      return NextResponse.json({
        status: "ok",
        checklists: (checklists ?? []).map((c: any) => ({ ...c, items: byChecklist.get(c.id) ?? [] })),
      });
    }

    return NextResponse.json(
      { status: "error", error: { code: "UNKNOWN_VIEW", message: `Unknown view "${view}" — use trial-balance, closes or month-end-close.` } },
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

  let body: { date?: string; action?: string; step?: string; year?: number; month?: number; drill?: boolean; item_key?: string; decision?: string; notes?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Attribute every operator action to the authenticated admin.
  const actorEmail = (auth as { email?: string }).email ?? "admin-console";

  // ---- Month-end close checklist actions (migration 20260914000060) ----
  if (body.action === "month-end-close") {
    const year = Number(body.year);
    const month = Number(body.month);
    const drill = body.drill === true;
    if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { status: "error", error: { code: "INVALID_PERIOD", message: "year and month are required (YYYY / 1-12)." } },
        { status: 400 },
      );
    }

    try {
      if (body.step === "run-item") {
        const itemKey = String(body.item_key ?? "");
        if (!["BANK_REC", "LIABILITY_REC", "REVENUE_REC", "COMMISSION_REC", "SUSPENSE_REVIEW"].includes(itemKey)) {
          return NextResponse.json(
            { status: "error", error: { code: "INVALID_ITEM", message: "item_key must be one of the five reconciliations." } },
            { status: 400 },
          );
        }
        const { data, error } = await admin.rpc("run_month_end_close_item", {
          p_year: year,
          p_month: month,
          p_item_key: itemKey,
          p_is_drill: drill,
          p_performed_by: actorEmail,
          p_notes: body.notes ?? null,
        });
        if (error) throw error;
        return NextResponse.json({ status: "ok", result: data });
      }

      if (body.step === "prepare") {
        const { data, error } = await admin.rpc("prepare_month_end_close", {
          p_year: year,
          p_month: month,
          p_is_drill: drill,
          p_prepared_by: actorEmail,
          p_notes: body.notes ?? null,
        });
        if (error) throw error;
        return NextResponse.json({ status: "ok", result: data });
      }

      if (body.step === "review") {
        const decision = String(body.decision ?? "").toUpperCase();
        if (decision !== "APPROVE" && decision !== "REJECT") {
          return NextResponse.json(
            { status: "error", error: { code: "INVALID_DECISION", message: "decision must be APPROVE or REJECT." } },
            { status: 400 },
          );
        }
        const { data, error } = await admin.rpc("review_month_end_close", {
          p_year: year,
          p_month: month,
          p_is_drill: drill,
          p_reviewed_by: actorEmail,
          p_decision: decision,
          p_notes: body.notes ?? null,
        });
        if (error) throw error;
        return NextResponse.json({ status: "ok", result: data });
      }

      return NextResponse.json(
        { status: "error", error: { code: "INVALID_STEP", message: "step must be run-item, prepare or review." } },
        { status: 400 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "The month-end close action did not complete.";
      const conflict =
        message.includes("MONTH_END_CLOSE_ALREADY_DECIDED") ||
        message.includes("MONTH_END_CLOSE_ITEMS_INCOMPLETE") ||
        message.includes("MONTH_END_CLOSE_PERIOD_INCOMPLETE") ||
        message.includes("MONTH_END_CLOSE_MISSING_DAILY_CLOSES") ||
        message.includes("MONTH_END_CLOSE_SELF_REVIEW_FORBIDDEN") ||
        message.includes("MONTH_END_CLOSE_NOT_PREPARED") ||
        message.includes("MONTH_END_CLOSE_TRIAL_BALANCE_INCONSISTENT");
      return NextResponse.json(
        { status: "error", error: { code: conflict ? "MONTH_END_CLOSE_CONFLICT" : "MONTH_END_CLOSE_FAILED", message } },
        { status: conflict ? 409 : 500 },
      );
    }
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
  const closedBy = actorEmail;

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
