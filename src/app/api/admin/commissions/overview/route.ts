import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderCurrencies } from "@/lib/regional/territoryScope";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/commissions/overview
 *
 * Commission sets impact: what the platform-wide schedule (agent_commission_
 * rates) has actually paid out, rolled up the two ways the admin console
 * needs it — per aggregator and per regional manager territory.
 *
 * Every figure comes from the commission engine's own tables
 * (agent_commissions), joined through agents → aggregator_territories →
 * aggregators. Nothing is estimated, and a region with no commissions is
 * reported as zero, not smoothed over.
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
      { status: "error", error: { code: "ADMIN_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  const [aggRes, terrRes, agentRes, commRes, managerRes] = await Promise.all([
    admin.from("aggregators").select("id, aggregator_code, business_name, country, currency, status").order("aggregator_code"),
    admin.from("aggregator_territories").select("id, name, code, state_or_region, country, aggregator_id").limit(5000),
    admin.from("agents").select("id, aggregator_territory_id").limit(20000),
    admin.from("agent_commissions").select("agent_id, amount, currency, status, earned_at").order("earned_at", { ascending: false }).limit(50000),
    admin.from("regional_manager_users").select("id, full_name, country, territories, status").order("full_name"),
  ]);

  const err = aggRes.error || terrRes.error || agentRes.error || commRes.error || managerRes.error;
  if (err) {
    return NextResponse.json(
      { status: "error", error: { code: "COMMISSION_OVERVIEW_FAILED", message: err.message } },
      { status: 500 },
    );
  }

  /* Joins in memory — the row counts here are network-scale, not ledger-scale. */
  const territoryById = new Map((terrRes.data ?? []).map((t: Record<string, unknown>) => [String(t.id), t]));
  const aggregatorByTerritory = new Map((terrRes.data ?? []).map((t: Record<string, unknown>) => [String(t.id), String(t.aggregator_id)]));

  type Bucket = { earned: number; settled: number; count: number };
  const bucket = (): Bucket => ({ earned: 0, settled: 0, count: 0 });
  const addCommission = (byCurrency: Record<string, Bucket>, cm: Record<string, unknown>) => {
    const cur = String(cm.currency || "NGN");
    const amount = Number(cm.amount || 0);
    byCurrency[cur] = byCurrency[cur] ?? bucket();
    byCurrency[cur].count += 1;
    if (cm.status === "SETTLED") byCurrency[cur].settled += amount;
    else byCurrency[cur].earned += amount;
  };

  const agentTerritory = new Map((agentRes.data ?? []).map((a: Record<string, unknown>) => [String(a.id), a.aggregator_territory_id ? String(a.aggregator_territory_id) : null]));

  /* ── Per aggregator ─────────────────────────────────────────────────── */
  const byAggregator = (aggRes.data ?? []).map((agg: Record<string, unknown>) => {
    const territories = (terrRes.data ?? []).filter(
      (t: Record<string, unknown>) => String(t.aggregator_id) === String(agg.id),
    );
    const territoryIds = new Set(territories.map((t: Record<string, unknown>) => String(t.id)));
    const byCurrency: Record<string, Bucket> = {};
    let lastEarnedAt: string | null = null;
    let agentCount = 0;
    for (const a of agentRes.data ?? []) {
      const tid = a.aggregator_territory_id ? String(a.aggregator_territory_id) : null;
      if (tid && territoryIds.has(tid)) agentCount += 1;
    }
    for (const cm of commRes.data ?? []) {
      const tid = agentTerritory.get(String(cm.agent_id));
      if (!tid || aggregatorByTerritory.get(tid) !== String(agg.id)) continue;
      addCommission(byCurrency, cm);
      if (!lastEarnedAt && cm.earned_at) lastEarnedAt = String(cm.earned_at);
    }
    return {
      aggregatorId: String(agg.id),
      code: String(agg.aggregator_code ?? "—"),
      businessName: String(agg.business_name ?? "—"),
      country: String(agg.country ?? "—"),
      status: String(agg.status ?? "—"),
      territories: territories.map((t: Record<string, unknown>) => ({ name: String(t.name ?? "—"), stateOrRegion: String(t.state_or_region ?? "—") })),
      agentCount,
      byCurrency,
      lastEarnedAt,
    };
  });

  /* ── Per regional manager ───────────────────────────────────────────── */
  const byRegionalManager = (managerRes.data ?? []).map((mgr: Record<string, unknown>) => {
    const managerTerritories = Array.isArray(mgr.territories) ? (mgr.territories as string[]) : [];
    // A manager covers an aggregator territory when it sits in one of their
    // states AND matches their country — same rule resolveTerritoryScope
    // applies on the regional portal.
    const covered = (terrRes.data ?? []).filter(
      (t: Record<string, unknown>) =>
        String(t.country) === String(mgr.country) && managerTerritories.includes(String(t.state_or_region)),
    );
    const coveredTerritoryIds = new Set(covered.map((t: Record<string, unknown>) => String(t.id)));
    const coveredAggregatorIds = new Set(covered.map((t: Record<string, unknown>) => String(t.aggregator_id)));

    const byCurrency: Record<string, Bucket> = {};
    let lastEarnedAt: string | null = null;
    for (const cm of commRes.data ?? []) {
      const tid = agentTerritory.get(String(cm.agent_id));
      if (!tid || !coveredTerritoryIds.has(tid)) continue;
      addCommission(byCurrency, cm);
      if (!lastEarnedAt && cm.earned_at) lastEarnedAt = String(cm.earned_at);
    }
    return {
      managerId: String(mgr.id),
      name: String(mgr.full_name ?? "—"),
      country: String(mgr.country ?? "—"),
      status: String(mgr.status ?? "—"),
      territories: managerTerritories,
      aggregatorCount: coveredAggregatorIds.size,
      agentCount: (agentRes.data ?? []).filter(
        (a: Record<string, unknown>) => a.aggregator_territory_id && coveredTerritoryIds.has(String(a.aggregator_territory_id)),
      ).length,
      byCurrency,
      lastEarnedAt,
    };
  });

  const totals: Record<string, Bucket> = {};
  for (const cm of commRes.data ?? []) addCommission(totals, cm);

  return NextResponse.json({
    status: "ok",
    totals,
    currencies: orderCurrencies(Object.keys(totals)),
    byAggregator,
    byRegionalManager,
    ratesNote:
      "One platform-wide schedule (agent_commission_rates) applies to every aggregator and territory — there are no per-aggregator or per-manager rate overrides.",
  });
}
