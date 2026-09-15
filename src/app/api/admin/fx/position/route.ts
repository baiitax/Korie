import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/fx/position — the desk's ledger-true FX position
 *      (generate_fx_position_report, migration 000057): per-currency FX-book
 *      units, the current governed rate with provenance, NGN market value,
 *      cumulative unrealized P&L, the last mark, and a stale_mark flag.
 *      Also returns the recent mark history.
 *
 * POST /api/admin/fx/position — run the end-of-day revaluation
 *      (run_fx_revaluation) for today or a given date. Controls enforced by
 *      the database, not this route:
 *        - one mark per (date, currency); re-runs are reported no-ops;
 *        - the first ever mark is a BASELINE at the current governed rate —
 *          an opening mark never invents a gain;
 *        - a moved rate posts the unrealized gain/loss through the
 *          sanctioned adjustment-journal path (attributed, reason, audited);
 *        - a position without a governed rate is refused, never guessed.
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
      { status: "error", error: { code: "FX_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  try {
    const { data: positions, error: posErr } = await admin.rpc("generate_fx_position_report");
    if (posErr) throw posErr;

    const { data: valuations, error: valErr } = await admin
      .from("fx_revaluations")
      .select(
        "id, valuation_date, position_currency, position_units, rate_used, rate_source, market_value_base, prior_rate_used, unrealized_gain_loss, status, ledger_transaction_id, run_by, created_at",
      )
      .order("valuation_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (valErr) throw valErr;

    return NextResponse.json({
      status: "ok",
      base_currency: "NGN",
      positions: (positions ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        position_units: Number(p.position_units),
        current_rate: p.current_rate == null ? null : Number(p.current_rate),
        market_value_base: Number(p.market_value_base),
        last_rate_used: p.last_rate_used == null ? null : Number(p.last_rate_used),
        cumulative_unrealized: Number(p.cumulative_unrealized),
      })),
      valuations: (valuations ?? []).map((v: Record<string, unknown>) => ({
        ...v,
        position_units: Number(v.position_units),
        rate_used: Number(v.rate_used),
        market_value_base: Number(v.market_value_base),
        prior_rate_used: v.prior_rate_used == null ? null : Number(v.prior_rate_used),
        unrealized_gain_loss: Number(v.unrealized_gain_loss),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "FX_POSITION_LOOKUP_FAILED", message: err instanceof Error ? err.message : "The position report did not load." },
      },
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
      { status: "error", error: { code: "FX_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  let body: { date?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional; defaults below apply
  }

  const date = body.date || new Date().toISOString().slice(0, 10);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { status: "error", error: { code: "INVALID_DATE", message: "date must be formatted as YYYY-MM-DD." } },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await admin.rpc("run_fx_revaluation", {
      p_valuation_date: date,
      p_run_by: (auth as { email?: string }).email ?? "fx-desk",
    });
    if (error) throw error;

    const summary = (data ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      status: "ok",
      result: {
        valuation_date: summary.valuation_date ?? date,
        positions_checked: summary.positions_checked ?? 0,
        baselines: summary.baselines ?? 0,
        marks_posted: summary.marks_posted ?? 0,
        marks_no_change: summary.marks_no_change ?? 0,
        skipped_zero_position: summary.skipped_zero_position ?? 0,
        skipped_already_marked: summary.skipped_already_marked ?? 0,
        skipped_no_rate: summary.skipped_no_rate ?? [],
        total_unrealized_gain_loss: Number(summary.total_unrealized_gain_loss ?? 0),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "FX_REVALUATION_RUN_FAILED", message: err instanceof Error ? err.message : "The revaluation did not complete." },
      },
      { status: 500 },
    );
  }
}
