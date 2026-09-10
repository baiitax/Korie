import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { runAmlMonitoringSweep } from "@/lib/aml/monitoringSweep";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/aml-monitoring
 *
 * Scheduled entry point for the AML monitoring sweep, for platforms that
 * support cron (e.g. vercel.json crons hitting this path with the CRON_SECRET
 * header). Also reachable manually by an operator holding CRON_SECRET.
 *
 * Auth: the `x-cron-secret` header (or Authorization: Bearer CRON_SECRET)
 * must match the CRON_SECRET environment variable. Without the variable
 * configured the endpoint refuses to run — it never opens unauthenticated.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { status: "error", error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET is not set; scheduled monitoring is disabled." } },
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

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "COMPLIANCE_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  try {
    const sweep = await runAmlMonitoringSweep(admin);
    return NextResponse.json({ status: "ok", sweep });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: { code: "SWEEP_FAILED", message: err instanceof Error ? err.message : "The monitoring sweep did not complete." } },
      { status: 500 },
    );
  }
}
