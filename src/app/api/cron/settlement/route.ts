import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { constantTimeStringEqual } from "@/lib/security/constantTimeCompare";

export const dynamic = "force-dynamic";

interface SettlementOutcome {
  orgId: string;
  currency: string;
  status: "POSTED" | "FAILED";
  batchReference?: string;
  totalCommissionAmount?: number;
  totalAgentCount?: number;
  error?: string;
}

/**
 * GET /api/cron/settlement
 *
 * Scheduled entry point for daily agent-commission settlement (Phase D —
 * closes findings F5/F6: `run_daily_settlement()` already existed and is
 * idempotent per (org, currency, date), but nothing ever called it on a
 * schedule — the dormant `pg_cron` block in
 * 20260906000029_agency_transfers_settlement_kyc_realtime.sql only ever
 * covered two hardcoded org IDs and pg_cron isn't enabled on this Supabase
 * plan anyway (confirmed: it silently no-ops via its own EXCEPTION WHEN
 * OTHERS handler).
 *
 * Unlike that dormant block, this route enumerates org/currency pairs
 * DYNAMICALLY every run — it asks the real data "which orgs have agents
 * with EARNED or PENDING_SETTLEMENT commissions right now?" instead of
 * hardcoding IDs, so a newly onboarded aggregator or agency org is covered
 * automatically the very next run with no code change required.
 *
 * For each distinct (org_id, currency) pair found, it calls
 * run_daily_settlement(org_id, currency) — the same RPC the two existing
 * manual endpoints (/api/v1/agency/ops/settlements/run and
 * /api/v1/aggregator/settlements/run) already use — and is safe to
 * re-trigger: the RPC's own (org_id, currency, settlement_date) UNIQUE
 * constraint on settlement_batches makes a same-day repeat call a no-op
 * that returns the already-posted batch rather than double-settling.
 *
 * Each successful batch also gets a real public.audit_events row and a
 * real public.aggregator_notifications row (for aggregator-owned orgs) so
 * ops/aggregator admins see the day's settlement result without needing to
 * poll — closing acceptance criterion #4 from the roadmap ("ops receives a
 * notification of each day's result without having to poll the portal").
 *
 * Auth: same CRON_SECRET pattern as /api/cron/financial-close and
 * /api/cron/aml-monitoring — constant-time compared, 503 if unconfigured,
 * 401 if the header doesn't match. Never opens unauthenticated.
 *
 * Optional query: ?date=YYYY-MM-DD to (re)run settlement for a past date.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { status: "error", error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET is not set; scheduled settlement is disabled." } },
      { status: 503 },
    );
  }
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided || !constantTimeStringEqual(provided, secret)) {
    return NextResponse.json(
      { status: "error", error: { code: "UNAUTHORIZED", message: "Invalid cron secret." } },
      { status: 401 },
    );
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  let settlementDate: string;
  if (dateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { status: "error", error: { code: "INVALID_DATE", message: "date must be formatted as YYYY-MM-DD." } },
        { status: 400 },
      );
    }
    settlementDate = dateParam;
  } else {
    settlementDate = new Date().toISOString().slice(0, 10);
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "SETTLEMENT_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  // Enumerate every distinct (org_id, currency) pair with real,
  // not-yet-settled commissions. This is the dynamic replacement for the
  // dormant pg_cron block's two hardcoded org IDs.
  const { data: pending, error: enumError } = await admin
    .from("agent_commissions")
    .select("currency, agents!inner(org_id)")
    .in("status", ["EARNED", "PENDING_SETTLEMENT"]);

  if (enumError) {
    return NextResponse.json(
      { status: "error", error: { code: "SETTLEMENT_ENUMERATION_FAILED", message: enumError.message } },
      { status: 500 },
    );
  }

  const pairs = new Map<string, { orgId: string; currency: string }>();
  for (const row of (pending ?? []) as any[]) {
    const orgId: string | undefined = row.agents?.org_id;
    const currency: string | undefined = row.currency;
    if (!orgId || !currency) continue;
    pairs.set(`${orgId}:${currency}`, { orgId, currency });
  }

  const results: SettlementOutcome[] = [];

  for (const { orgId, currency } of Array.from(pairs.values())) {
    const { data: batch, error } = await admin.rpc("run_daily_settlement", {
      p_org_id: orgId,
      p_currency: currency,
      p_settlement_date: settlementDate,
    });

    if (error) {
      results.push({ orgId, currency, status: "FAILED", error: error.message });
      await admin.from("audit_events").insert({
        org_id: orgId,
        actor_id: "cron",
        actor_email: "cron@koriepay.internal",
        actor_role: "SYSTEM",
        action: "SETTLEMENT_RUN_FAILED",
        resource_type: "settlement_batches",
        resource_id: `${orgId}:${currency}:${settlementDate}`,
        details: `Scheduled settlement failed for ${currency} on ${settlementDate}: ${error.message}`,
        ip_address: "cron",
        request_id: `KP-CRON-${Date.now()}`,
        correlation_id: `KP-CRON-SETTLEMENT-${settlementDate}`,
      });
      continue;
    }

    results.push({
      orgId,
      currency,
      status: "POSTED",
      batchReference: batch.batch_reference,
      totalCommissionAmount: Number(batch.total_commission_amount),
      totalAgentCount: batch.total_agent_count,
    });

    await admin.from("audit_events").insert({
      org_id: orgId,
      actor_id: "cron",
      actor_email: "cron@koriepay.internal",
      actor_role: "SYSTEM",
      action: "SETTLEMENT_RUN",
      resource_type: "settlement_batches",
      resource_id: batch.id,
      details: `Scheduled settlement posted batch ${batch.batch_reference}: ${batch.total_agent_count} agent(s), ${batch.total_commission_amount} ${currency}.`,
      ip_address: "cron",
      request_id: `KP-CRON-${Date.now()}`,
      correlation_id: `KP-CRON-SETTLEMENT-${settlementDate}`,
    });

    // Notify the aggregator's own portal (if this org is an aggregator) so
    // Owner/Admin/Finance staff see the result without polling. Orgs that
    // aren't aggregator-owned (e.g. the platform's own agency org) simply
    // have no matching row here and are silently skipped — this is a
    // best-effort convenience notification, not the settlement of record
    // (that's the audit_events row above and the batch itself).
    const { data: aggRow } = await admin.from("aggregators").select("id").eq("org_id", orgId).maybeSingle();
    if (aggRow?.id) {
      await admin.from("aggregator_notifications").insert({
        aggregator_id: aggRow.id,
        category: "SETTLEMENT",
        severity: "INFO",
        title: `Daily settlement posted — ${currency}`,
        body: `Batch ${batch.batch_reference} settled ${batch.total_agent_count} agent(s) totalling ${batch.total_commission_amount} ${currency} for ${settlementDate}.`,
      });
    }
  }

  const failures = results.filter((r) => r.status === "FAILED");

  return NextResponse.json({
    status: failures.length > 0 ? "partial_failure" : "ok",
    settlementDate,
    pairsProcessed: results.length,
    results,
  });
}
