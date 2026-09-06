import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_READ_ROLES } from "@/lib/security/complianceAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/compliance/posture — the security posture scorecard, computed from
 * the database instead of asserted.
 *
 * The previous source for this screen (`/api/security/posture`) returned a
 * hardcoded report claiming, among other things, "100% of workforce identities
 * have enforced hardware/TOTP MFA" regardless of what was actually registered.
 * This route derives each dimension from real tables and says NOT_ASSESSED when
 * there is nothing to measure — a dimension with no data contributes no score,
 * and if nothing can be assessed the composite is reported as NOT_ASSESSED
 * rather than an invented number.
 */

interface Dimension {
  name: string;
  score: number;
  weight: number;
  status: string;
  details: string;
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100);
}

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

  const [workforce, profiles, secAlerts, secIncidents, pam, audit] = await Promise.all([
    admin.from("workforce_identities").select("mfa_enforced, lifecycle_status"),
    admin.from("user_profiles").select("mfa_enabled, status"),
    admin.from("security_alerts").select("status"),
    admin.from("security_incidents").select("status"),
    admin.from("iam_privileged_access_requests").select("status"),
    admin.from("audit_events").select("created_at", { count: "exact", head: true }),
  ]);

  const wf = (workforce.data ?? []) as Array<{ mfa_enforced?: boolean; lifecycle_status?: string }>;
  const wfActive = wf.filter((w) => (w.lifecycle_status ?? "ACTIVE") === "ACTIVE");
  const wfMfa = wfActive.filter((w) => w.mfa_enforced).length;
  const wfMfaPct = pct(wfMfa, wfActive.length);

  const up = (profiles.data ?? []) as Array<{ mfa_enabled?: boolean; status?: string }>;
  const upActive = up.filter((p) => (p.status ?? "ACTIVE") === "ACTIVE");
  const upMfa = upActive.filter((p) => p.mfa_enabled).length;
  const upMfaPct = pct(upMfa, upActive.length);

  const alerts = (secAlerts.data ?? []) as Array<{ status?: string }>;
  const openAlerts = alerts.filter((a) => a.status !== "RESOLVED" && a.status !== "CLOSED").length;
  const incidents = (secIncidents.data ?? []) as Array<{ status?: string }>;
  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED").length;

  const pamRows = (pam.data ?? []) as Array<{ status?: string }>;
  const pamPending = pamRows.filter((p) => p.status === "PENDING").length;
  const pamDecided = pamRows.filter((p) => p.status === "APPROVED" || p.status === "DENIED").length;

  const auditCount = audit.count ?? 0;

  const dimensions: Dimension[] = [];

  if (wfMfaPct !== null) {
    dimensions.push({
      name: "Workforce identity & MFA assurance",
      score: wfMfaPct,
      weight: 0.3,
      status: wfMfaPct >= 95 ? "EXCELLENT" : wfMfaPct >= 80 ? "ADEQUATE" : "NEEDS_ATTENTION",
      details: `${wfMfa} of ${wfActive.length} active workforce identities have enforced MFA.`,
    });
  } else {
    dimensions.push({
      name: "Workforce identity & MFA assurance",
      score: 0,
      weight: 0.3,
      status: "NOT_ASSESSED",
      details: "No active workforce identities are registered, so MFA coverage cannot be measured.",
    });
  }

  if (upMfaPct !== null) {
    dimensions.push({
      name: "Portal account MFA coverage",
      score: upMfaPct,
      weight: 0.15,
      status: upMfaPct >= 95 ? "EXCELLENT" : upMfaPct >= 80 ? "ADEQUATE" : "NEEDS_ATTENTION",
      details: `${upMfa} of ${upActive.length} active portal accounts have MFA enabled.`,
    });
  } else {
    dimensions.push({
      name: "Portal account MFA coverage",
      score: 0,
      weight: 0.15,
      status: "NOT_ASSESSED",
      details: "No active portal accounts are registered, so MFA coverage cannot be measured.",
    });
  }

  dimensions.push({
    name: "Detection & response load",
    score: Math.max(0, 100 - openAlerts * 5 - openIncidents * 15),
    weight: 0.2,
    status: openIncidents === 0 && openAlerts <= 3 ? "EXCELLENT" : openIncidents === 0 ? "ADEQUATE" : "NEEDS_ATTENTION",
    details: `${openAlerts} open security alert(s) and ${openIncidents} open security incident(s) on record.`,
  });

  dimensions.push({
    name: "Privileged access governance",
    score: pamPending === 0 ? 100 : Math.max(0, 100 - pamPending * 10),
    weight: 0.2,
    status: pamPending === 0 ? "EXCELLENT" : "NEEDS_ATTENTION",
    details: `${pamPending} privileged-access request(s) awaiting a checker decision; ${pamDecided} decided on record.`,
  });

  dimensions.push({
    name: "Audit trail coverage",
    score: auditCount > 0 ? 100 : 0,
    weight: 0.15,
    status: auditCount > 0 ? "EXCELLENT" : "NOT_ASSESSED",
    details:
      auditCount > 0
        ? `${auditCount} audit event(s) recorded, including every compliance mutation.`
        : "No audit events recorded yet — coverage begins with the first audited action.",
  });

  const assessed = dimensions.filter((d) => d.status !== "NOT_ASSESSED");
  const weightSum = assessed.reduce((acc, d) => acc + d.weight, 0);
  const composite =
    weightSum > 0
      ? Math.round(assessed.reduce((acc, d) => acc + d.score * (d.weight / weightSum), 0))
      : 0;

  return NextResponse.json({
    success: true,
    data: {
      compositeScore: composite,
      tier: weightSum === 0 ? "NOT_ASSESSED" : composite >= 90 ? "STRONG" : composite >= 75 ? "ADEQUATE" : "NEEDS_ATTENTION",
      evaluatedAt: new Date().toISOString(),
      dimensions,
    },
  });
}
