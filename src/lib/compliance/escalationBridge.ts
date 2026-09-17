/**
 * Escalation bridge (roadmap 3.1, PS-6).
 *
 * When a support officer escalates a ticket to COMPLIANCE or FRAUD_RISK, the
 * compliance console historically learned about it only if somebody went
 * looking. This bridge makes the referral a first-class compliance record:
 * it creates a real aml_alerts row classified under the SUPPORT_ESC_01
 * scenario (officer referral — explicitly NOT an engine detection) and links
 * both ways:
 *
 *   support_escalations.external_ref  =  aml_alerts.alert_reference
 *   aml_alerts.source_reference       =  support_escalations.escalation_number
 *
 * The linkage is idempotent at three levels: the bridge skips escalations
 * that already have external_ref, a UNIQUE index on aml_alerts.source_reference
 * rejects racing duplicates, and the hourly sweep retries un-bridged open
 * COMPLIANCE/FRAUD_RISK escalations (see cron/support-sweep) so a transient
 * failure self-heals instead of silently disappearing.
 *
 * The compliance console's bell derives its notifications from real rows, so
 * a bridged referral appears there without any messaging fabric (see
 * services/compliance/derive.ts).
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { insertEventRow } from "@/lib/support/supportDb";

/** The referral scenario seeded by migration 20260917000001. */
export const SUPPORT_REFERRAL_SCENARIO_CODE = "SUPPORT_ESC_01";
const SUPPORT_REFERRAL_SCENARIO_ID = "8f0f2a5e-0000-4000-8000-726566657272";

export const BRIDGE_DESTINATIONS = ["COMPLIANCE", "FRAUD_RISK"] as const;
export type BridgeDestination = (typeof BRIDGE_DESTINATIONS)[number];

/** Support priorities → AML severities (both are the consoles' real enums). */
export function severityFromPriority(priority: string): "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW" {
  switch (priority) {
    case "URGENT":
    case "CRITICAL":
      return "P0_CRITICAL";
    case "HIGH":
      return "P1_HIGH";
    case "LOW":
      return "P3_LOW";
    default:
      return "P2_MEDIUM";
  }
}

export interface BridgeEscalation {
  id: string;
  escalationNumber: string;
  ticketId: string;
  destination: string;
  reason: string;
  priority: string;
  slaDueAt: string;
  externalRef: string | null;
}

export interface BridgeTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  jurisdiction: string | null;
  relatedTransactionReference: string | null;
}

export type BridgeOutcome =
  | { status: "skipped"; reason: "not-bridge-destination" | "already-bridged" | "no-customer" }
  | { status: "bridged"; alertId: string; alertReference: string }
  | { status: "error"; error: string };

/** Resolve (self-healing) the SUPPORT_ESC_01 scenario row. Migration owns it;
 *  this re-inserts it if an environment somehow lacks it. */
async function ensureReferralScenario(): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from("aml_scenarios")
    .select("id")
    .eq("scenario_code", SUPPORT_REFERRAL_SCENARIO_CODE)
    .maybeSingle();
  if (existing?.id) return String(existing.id);

  await admin
    .from("aml_scenarios")
    .insert({
      id: SUPPORT_REFERRAL_SCENARIO_ID,
      scenario_code: SUPPORT_REFERRAL_SCENARIO_CODE,
      name: "Support-Referred Risk Escalation",
      description:
        "Officer referral: a support officer escalated a ticket to COMPLIANCE or FRAUD_RISK. Not engine-detected — the alert records an officer's judgment that the matter needs compliance review.",
      category: "SUPPORT_REFERRAL",
      severity: "P1_HIGH",
      jurisdiction: "GLOBAL",
      is_active: false,
      version: 1,
      time_window_seconds: 0,
      rule_config: {},
    })
    .then(
      () => undefined,
      () => undefined, // unique index — a racing insert is fine, re-select below
    );
  const { data: row } = await admin
    .from("aml_scenarios")
    .select("id")
    .eq("scenario_code", SUPPORT_REFERRAL_SCENARIO_CODE)
    .maybeSingle();
  if (!row?.id) throw new Error("SUPPORT_ESC_01 scenario row missing and could not be created");
  return String(row.id);
}

function makeAlertReference(): string {
  // Same shape as the engine's (KPC-AL-YYYYMMDD-XXXXXX) so references sort
  // and render identically across engine and referral alerts.
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `KPC-AL-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

/**
 * Create the compliance referral alert for an escalation. Safe to call
 * repeatedly (idempotent per escalation); never throws — failures come back
 * as { status: "error" } so callers can record them on the ticket timeline.
 */
export async function bridgeEscalationToCompliance(
  escalation: BridgeEscalation,
  ticket: BridgeTicket,
): Promise<BridgeOutcome> {
  if (!(BRIDGE_DESTINATIONS as readonly string[]).includes(escalation.destination)) {
    return { status: "skipped", reason: "not-bridge-destination" };
  }
  if (escalation.externalRef) {
    return { status: "skipped", reason: "already-bridged" };
  }
  if (!ticket.customerId) {
    // aml_alerts.customer_id is NOT NULL — without a customer there is no
    // honest alert row to create. The failure is recorded on the timeline.
    return { status: "skipped", reason: "no-customer" };
  }

  try {
    const admin = getSupabaseAdminClient();
    const scenarioId = await ensureReferralScenario();

    const alertReference = makeAlertReference();
    const whoInvolved = `${ticket.customerName ?? "Customer record"} (${ticket.customerEmail ?? "no email on file"})`;
    const whatHappened = `Officer referral: support ticket ${ticket.ticketNumber} ("${ticket.subject}") was escalated to ${escalation.destination}.`;
    const whySuspicious = `${escalation.reason} — judged by the referring support officer to need compliance review.`;
    const howDetected = `Not engine-detected. Referred via support escalation ${escalation.escalationNumber} (ticket ${ticket.ticketNumber}${ticket.jurisdiction ? `, ${ticket.jurisdiction}` : ""}).`;

    const { data: alert, error: insertErr } = await admin
      .from("aml_alerts")
      .insert({
        alert_reference: alertReference,
        scenario_id: scenarioId,
        scenario_code: SUPPORT_REFERRAL_SCENARIO_CODE,
        scenario_version: 1,
        customer_id: ticket.customerId,
        severity: severityFromPriority(escalation.priority),
        status: "NEW",
        disputed_or_triggered_amount: 0,
        currency: "NGN",
        transaction_reference: ticket.relatedTransactionReference ?? null,
        what_happened: whatHappened,
        why_suspicious: whySuspicious,
        who_involved: whoInvolved,
        how_pattern_detected: howDetected,
        feature_snapshot: {
          source: "support_escalation",
          escalation_id: escalation.id,
          escalation_number: escalation.escalationNumber,
          ticket_id: ticket.id,
          ticket_number: ticket.ticketNumber,
          destination: escalation.destination,
          bridged_at: new Date().toISOString(),
        },
        sla_due_at: escalation.slaDueAt,
        is_sla_breached: false,
        source_reference: escalation.escalationNumber,
      })
      .select("id, alert_reference")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        // A racing run bridged this escalation first — resolve the winner.
        const { data: winner } = await admin
          .from("aml_alerts")
          .select("id, alert_reference")
          .eq("source_reference", escalation.escalationNumber)
          .maybeSingle();
        if (winner) {
          await admin.from("support_escalations").update({ external_ref: winner.alert_reference }).eq("id", escalation.id);
          return { status: "bridged", alertId: String(winner.id), alertReference: String(winner.alert_reference) };
        }
      }
      return { status: "error", error: `alert insert failed: ${insertErr.message}` };
    }

    const { error: linkErr } = await admin
      .from("support_escalations")
      .update({ external_ref: alert!.alert_reference })
      .eq("id", escalation.id);
    if (linkErr) {
      return { status: "error", error: `escalation link update failed: ${linkErr.message}` };
    }

    await insertEventRow({
      ticket_id: ticket.id,
      event_type: "ESCALATION_BRIDGED",
      actor_id: "ESCALATION-BRIDGE",
      actor_name: "Escalation bridge",
      actor_role: "SYSTEM",
      payload: {
        destination: escalation.destination,
        escalation_id: escalation.id,
        escalation_number: escalation.escalationNumber,
        alert_id: alert!.id,
        alert_reference: alert!.alert_reference,
      },
    });

    return { status: "bridged", alertId: String(alert!.id), alertReference: String(alert!.alert_reference) };
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : "unknown bridge failure" };
  }
}
