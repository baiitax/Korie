import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/fx/rates — the administered FX reference rates, their
 *      change history, and who changed them.
 * POST /api/admin/fx/rates — re-rate a currency pair through
 *      update_fx_rate_pair (migration 20260914000053).
 *
 * Controls enforced by the database, not this route:
 *  - every change is attributed to an actor (uuid) and snapshotted into
 *    fx_rate_history (old → new) by the governance trigger;
 *  - the reverse rate is auto-derived as 1/rate, so pairs are reciprocal by
 *    construction and no unbooked spread can be introduced (F18);
 *  - a rate source (provenance) is required — where the number came from;
 *  - the deferred reciprocity constraint trigger validates the pair's final
 *    state at commit, so direct SQL tampering beyond 1% parity is refused.
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
    const { data: rates, error: ratesErr } = await admin
      .from("fx_rates")
      .select("id, source_currency, destination_currency, rate, source, updated_by, updated_at")
      .order("source_currency");
    if (ratesErr) throw ratesErr;

    const { data: history, error: historyErr } = await admin
      .from("fx_rate_history")
      .select("id, source_currency, destination_currency, old_rate, new_rate, changed_by, changed_at")
      .order("changed_at", { ascending: false })
      .limit(50);
    if (historyErr) throw historyErr;

    // fx_rate_history.changed_by has no FK relationship to user_profiles,
    // so resolve actor display names separately.
    const actorIds = Array.from(new Set((history ?? []).map((h: { changed_by: string | null }) => h.changed_by).filter(Boolean))) as string[];
    const actors: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await admin
        .from("user_profiles")
        .select("auth_user_id, email, full_name")
        .in("auth_user_id", actorIds);
      for (const p of profiles ?? []) {
        actors[p.auth_user_id] = p.full_name ? `${p.full_name} (${p.email})` : p.email;
      }
    }

    return NextResponse.json({
      status: "ok",
      rates: (rates ?? []).map((r: { rate: string | number }) => ({ ...r, rate: Number(r.rate) })),
      history: (history ?? []).map((h: { old_rate: string | number; new_rate: string | number; changed_by: string | null }) => ({
        ...h,
        old_rate: Number(h.old_rate),
        new_rate: Number(h.new_rate),
        changed_by_name: h.changed_by ? actors[h.changed_by] ?? h.changed_by : null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: { code: "FX_RATES_LOOKUP_FAILED", message: err instanceof Error ? err.message : "The rate list did not load." } },
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
  if (!auth.userId) {
    return NextResponse.json(
      { status: "error", error: { code: "FX_RATE_ACTOR_UNKNOWN", message: "Cannot attribute this change — no admin user identity on the session." } },
      { status: 401 },
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

  let body: { source_currency?: string; destination_currency?: string; new_rate?: number; rate_source?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", error: { code: "INVALID_JSON", message: "Invalid JSON body." } }, { status: 400 });
  }

  const { source_currency, destination_currency, new_rate, rate_source, notes } = body;
  if (!source_currency || !destination_currency) {
    return NextResponse.json({ status: "error", error: { code: "INVALID_PAIR", message: "source_currency and destination_currency are required." } }, { status: 400 });
  }
  const rate = Number(new_rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ status: "error", error: { code: "INVALID_RATE", message: "new_rate must be a positive number." } }, { status: 400 });
  }
  if (!rate_source || rate_source.trim().length < 4) {
    return NextResponse.json({ status: "error", error: { code: "INVALID_RATE_SOURCE", message: "rate_source is required (e.g. CBN-DAILY-2026-09-14, DESK-MANUAL-YYYY-MM-DD)." } }, { status: 400 });
  }

  try {
    const { data, error } = await admin.rpc("update_fx_rate_pair", {
      p_source_currency: source_currency,
      p_destination_currency: destination_currency,
      p_new_rate: rate,
      p_updated_by: auth.userId,
      p_rate_source: rate_source.trim(),
      p_notes: notes?.trim() || null,
    });
    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      result: {
        forward: data?.forward,
        reverse: data?.reverse,
        old_forward_rate: Number(data?.old_forward_rate),
        old_reverse_rate: Number(data?.old_reverse_rate),
        history_rows_added: data?.history_rows_added,
        actor: (auth as { email?: string }).email ?? "admin-console",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The rate change did not complete.";
    const badRequest =
      message.includes("FX_RATE_INVALID") ||
      message.includes("FX_RATE_SOURCE_REQUIRED") ||
      message.includes("FX_RATE_ACTOR_REQUIRED");
    const notFound = message.includes("FX_RATE_PAIR_NOT_FOUND");
    const conflict = message.includes("FX_RATE_PAIR_NOT_RECIPROCAL") || message.includes("FX_RATE_UPDATE_REQUIRES_ACTOR");
    return NextResponse.json(
      {
        status: "error",
        error: {
          code: badRequest ? "FX_RATE_INVALID_INPUT" : notFound ? "FX_RATE_PAIR_NOT_FOUND" : conflict ? "FX_RATE_CONFLICT" : "FX_RATE_UPDATE_FAILED",
          message,
        },
      },
      { status: badRequest ? 400 : notFound ? 404 : conflict ? 409 : 500 },
    );
  }
}
