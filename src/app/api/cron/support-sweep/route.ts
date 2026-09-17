import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { runSupportAgingSweep } from "@/lib/support/agingSweep";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/support-sweep
 *
 * Hourly support aging sweep (roadmap 3.3 + 3.4):
 *   - SLA warning/breach events for EVERY open ticket (previously they only
 *     fired when a ticket happened to be read or transitioned);
 *   - auto-close of tickets resolved more than 72h ago;
 *   - open disputes older than 72h climb one priority step (with a support
 *     notification, once per bump);
 *   - pending maker-checker dispute decisions older than 24h get a checker
 *     reminder (once per request). Money-movement requests are counted and
 *     reported — the admin console has no notification bell to notify into;
 *   - KYC documents expiring within 30 days get a task + a customer
 *     notification (one per document, ever);
 *   - un-bridged COMPLIANCE/FRAUD_RISK escalations are retried through the
 *     escalation bridge (roadmap 3.1 self-healing).
 *
 * Every pass is idempotent — double-runs create nothing twice. See
 * src/lib/support/agingSweep.ts for the per-pass guards.
 *
 * Auth: the `x-cron-secret` header (or Authorization: Bearer CRON_SECRET)
 * must match the CRON_SECRET environment variable. Without the variable
 * configured the endpoint refuses to run — it never opens unauthenticated.
 * Note: on Vercel's Hobby plan cron jobs fire once a day, not hourly — the
 * endpoint itself is plan-independent.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { status: "error", error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET is not set; the support sweep is disabled." } },
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
      { status: "error", error: { code: "SUPPORT_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  try {
    const sweep = await runSupportAgingSweep();

    // Liveness trail (roadmap Phase 5 wants cron last-run visibility): one
    // audit row per run with the full report.
    try {
      await admin.from("audit_events").insert({
        action: "SUPPORT_AGING_SWEEP",
        resource_type: "cron",
        resource_id: "support-sweep",
        actor_id: "00000000-0000-0000-0000-000000000000",
        actor_email: "cron@koriepay.internal",
        actor_role: "SYSTEM",
        details: { ...sweep },
        ip_address: request.headers.get("x-forwarded-for") ?? "unrecorded",
        request_id: request.headers.get("x-kp-request-id") ?? `cron-${Date.now().toString(36)}`,
      });
    } catch {
      // The sweep already ran; a failed liveness row must not misreport it.
    }

    return NextResponse.json({ status: "ok", sweep });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: { code: "SWEEP_FAILED", message: err instanceof Error ? err.message : "The support sweep did not complete." } },
      { status: 500 },
    );
  }
}
