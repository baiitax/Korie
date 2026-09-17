import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_READ_ROLES } from "@/lib/security/complianceAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/compliance/analytics — financial-crime KPIs computed from the
 * database, replacing the hardcoded numbers the old analytics screen showed
 * ("Case Conversion Rate 28.4%", "Mean SLA 18.2 hrs", "Sanctions False
 * Positive Rate 62.5%", "Regulatory Compliance Score 99.4%" — none of them
 * came from anywhere).
 *
 * Rules this endpoint follows (roadmap 2.3):
 *   - Every number traces to a query and ships with its numerator and
 *     denominator so an auditor can check it.
 *   - A metric with nothing to measure is `assessed: false` with the reason
 *     stated — never 0%, never an invented figure.
 *   - The sanctions false-positive rate is explicitly NOT_ASSESSED: screening
 *     runs are audited (audit_events AML_SCREENING_RUN) but no table records
 *     a match disposition, so a "false positive" cannot be counted honestly.
 */

interface Kpi {
  key: string;
  value: number | null;
  unit: "percent" | "hours" | "count" | "runs";
  assessed: boolean;
  numerator?: number;
  denominator?: number;
  details: string;
}

interface JurisdictionExposure {
  jurisdiction: string;
  openCases: number;
  totalCases: number;
  exposureAmount: number;
  currency: string;
}

const WINDOW_DAYS = 30;

export async function GET(request: NextRequest) {
  const auth = await authorizeComplianceRequest(request, COMPLIANCE_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { success: false, error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "COMPLIANCE_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  // ── 1. Alert → case conversion (aml_alerts.case_id) ───────────────────────
  const { data: alertRows, error: alertErr } = await admin
    .from("aml_alerts")
    .select("id, case_id, severity, status");
  if (alertErr) {
    return NextResponse.json(
      { success: false, error: { code: "ANALYTICS_READ_FAILED", message: alertErr.message } },
      { status: 502 },
    );
  }
  const alerts = (alertRows ?? []) as { id: string; case_id: string | null; severity: string; status: string }[];
  const totalAlerts = alerts.length;
  const converted = alerts.filter((a) => a.case_id != null).length;

  const conversion: Kpi = {
    key: "alert_to_case_conversion",
    value: totalAlerts > 0 ? Math.round((converted / totalAlerts) * 100) : null,
    unit: "percent",
    assessed: totalAlerts > 0,
    numerator: converted,
    denominator: totalAlerts,
    details: `${converted} of ${totalAlerts} AML alerts carry a case_id (aml_alerts.case_id).`,
  };

  // ── 2. Mean case resolution time (aml_cases.created_at → closed_at) ───────
  const { data: caseRows, error: caseErr } = await admin
    .from("aml_cases")
    .select("id, jurisdiction, status, total_exposure_amount, currency, created_at, closed_at");
  if (caseErr) {
    return NextResponse.json(
      { success: false, error: { code: "ANALYTICS_READ_FAILED", message: caseErr.message } },
      { status: 502 },
    );
  }
  const cases = (caseRows ?? []) as {
    id: string;
    jurisdiction: string;
    status: string;
    total_exposure_amount: number;
    currency: string;
    created_at: string;
    closed_at: string | null;
  }[];
  const closed = cases.filter((c) => c.closed_at != null);
  const meanHours =
    closed.length > 0
      ? closed.reduce(
          (sum, c) => sum + (Date.parse(c.closed_at as string) - Date.parse(c.created_at)) / 3_600_000,
          0,
        ) / closed.length
      : null;

  const resolution: Kpi = {
    key: "mean_case_resolution_hours",
    value: meanHours != null ? Math.round(meanHours * 10) / 10 : null,
    unit: "hours",
    assessed: closed.length > 0,
    numerator: closed.length,
    denominator: cases.length,
    details:
      closed.length > 0
        ? `Mean of created_at → closed_at across ${closed.length} closed case(s) of ${cases.length} total (aml_cases).`
        : `No case has a closed_at yet (${cases.length} case(s), all open) — there is no resolution time to report.`,
  };

  // ── 3. Sanctions screening volume (audit_events AML_SCREENING_RUN) ────────
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 3_600_000).toISOString();
  const { data: screeningRows } = await admin
    .from("audit_events")
    .select("created_at, after_state")
    .eq("action", "AML_SCREENING_RUN")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);
  const screening = (screeningRows ?? []) as { created_at: string; after_state: Record<string, unknown> | null }[];
  const matchRuns = screening.filter((s) => {
    const r = s.after_state ?? {};
    return r.isSanctionMatch === true || r.isPep === true || Number(r.matchScore ?? 0) > 0;
  }).length;

  const screeningVolume: Kpi = {
    key: "sanctions_screening_runs",
    value: screening.length,
    unit: "runs",
    assessed: true,
    numerator: matchRuns,
    denominator: screening.length,
    details: `${screening.length} screening run(s) audited in the last ${WINDOW_DAYS} days (audit_events AML_SCREENING_RUN); ${matchRuns} returned a potential match (isSanctionMatch / isPep / matchScore > 0).`,
  };

  const falsePositive: Kpi = {
    key: "sanctions_false_positive_rate",
    value: null,
    unit: "percent",
    assessed: false,
    details:
      "Not assessed: screening runs are audited but no table records the officer's disposition of a match, so false positives cannot be counted honestly. Recording match dispositions is a prerequisite for this metric.",
  };

  // ── 4. Regulatory obligations on file (regulatory_obligations) ─────────────
  const { data: obligationRows } = await admin
    .from("regulatory_obligations")
    .select("status, due_date");
  const obligations = (obligationRows ?? []) as { status: string; due_date: string | null }[];
  const filedStatuses = ["FILED", "SUBMITTED", "ACCEPTED", "COMPLETED"];
  const overdue = obligations.filter(
    (o) => o.due_date != null && Date.parse(o.due_date) < Date.now() && !filedStatuses.includes(o.status),
  ).length;

  const obligationsKpi: Kpi = {
    key: "obligations_overdue",
    value: overdue,
    unit: "count",
    assessed: true,
    numerator: overdue,
    denominator: obligations.length,
    details: `${overdue} of ${obligations.length} statutory obligation(s) are past due_date without a filed status (regulatory_obligations).`,
  };

  // ── 5. Per-jurisdiction exposure (aml_cases) ───────────────────────────────
  const byJurisdiction = new Map<string, JurisdictionExposure>();
  for (const c of cases) {
    const entry =
      byJurisdiction.get(c.jurisdiction) ??
      ({
        jurisdiction: c.jurisdiction,
        openCases: 0,
        totalCases: 0,
        exposureAmount: 0,
        currency: c.currency,
      } as JurisdictionExposure);
    entry.totalCases += 1;
    if (c.closed_at == null) entry.openCases += 1;
    entry.exposureAmount += Number(c.total_exposure_amount ?? 0);
    byJurisdiction.set(c.jurisdiction, entry);
  }

  const severityCounts = new Map<string, number>();
  for (const a of alerts) severityCounts.set(a.severity, (severityCounts.get(a.severity) ?? 0) + 1);
  const statusCounts = new Map<string, number>();
  for (const a of alerts) statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);

  return NextResponse.json({
    success: true,
    evaluatedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    kpis: [conversion, resolution, screeningVolume, falsePositive, obligationsKpi],
    jurisdictionExposure: Array.from(byJurisdiction.values()).sort((a, b) => b.exposureAmount - a.exposureAmount),
    alertSeverity: Array.from(severityCounts.entries()).map(([severity, count]) => ({ severity, count })),
    alertStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    sources: [
      "public.aml_alerts (case_id, severity, status)",
      "public.aml_cases (created_at, closed_at, jurisdiction, total_exposure_amount)",
      "public.audit_events (action = AML_SCREENING_RUN, after_state)",
      "public.regulatory_obligations (status, due_date)",
    ],
  });
}
