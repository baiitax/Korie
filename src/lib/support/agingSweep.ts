/**
 * Hourly support aging sweep (roadmap 3.3 + 3.4).
 *
 * Everything here is idempotent by construction — the cron will fire this
 * every hour and double-runs must not duplicate rows:
 *   - SLA events fire once per ticket per type (support_events guard);
 *   - auto-close flips status once (closed_at guard);
 *   - dispute priority bumps climb a ladder and stop at URGENT, and notify
 *     only when a bump actually happened;
 *   - checker reminders set maker_checker_requests.checker_reminded_at when
 *     delivered, so a request is reminded at most once;
 *   - KYC expiry tasks dedupe on support_tasks.source_ref;
 *   - the escalation bridge is idempotent (external_ref + unique index on
 *     aml_alerts.source_reference).
 *
 * Honest limits, visible in the report rather than papered over:
 *   - money-movement maker-checker requests (settlements, reversals) age in
 *     the ADMIN console, which has no notification bell — they are counted
 *     and reported, not "notified" into a surface that does not exist;
 *   - no customer_kyc_documents row currently has expires_at set, so the
 *     KYC pass runs and finds nothing (that is the honest answer).
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupportOpsEngine } from "@/lib/support/SupportOpsEngine";
import { insertNotificationRow } from "@/lib/support/supportDb";
import { bridgeEscalationToCompliance } from "@/lib/compliance/escalationBridge";

export interface AgingSweepReport {
  ranAt: string;
  /** Open tickets whose SLA state was evaluated (3.4). */
  slaSwept: number;
  /** Resolved >72h tickets auto-closed this run. */
  autoClosed: number;
  /** Open >72h disputes whose priority was bumped (3.3). */
  disputesBumped: number;
  /** Pending >24h dispute decisions whose checker was reminded (3.3). */
  checkerReminders: number;
  /** Pending >24h money-movement requests — reported only, no admin bell exists. */
  moneyMovementAging: number;
  /** KYC documents nearing expiry tasked this run (3.3). */
  kycTasksCreated: number;
  /** Un-bridged COMPLIANCE/FRAUD_RISK escalations bridged this run (3.1 retry). */
  bridgeRetried: number;
  notes: string[];
}

/** One step per sweep run — pinned by tests (tests/agingSweep.test.ts). */
export const DISPUTE_BUMP_LADDER: Record<string, string | undefined> = {
  LOW: "NORMAL",
  NORMAL: "HIGH",
  HIGH: "URGENT",
  URGENT: undefined, // already at the top — the ladder's fixpoint is the idempotency
};

/** Dispute statuses that are still awaiting an outcome (DECISION = with the maker-checker queue). */
export const AGING_DISPUTE_STATUSES = ["OPEN", "UNDER_REVIEW", "REQUESTED_INFORMATION", "ESCALATED"];

const HOURS = 3600_000;

export async function runSupportAgingSweep(): Promise<AgingSweepReport> {
  const admin = getSupabaseAdminClient();
  const engine = getSupportOpsEngine();
  const report: AgingSweepReport = {
    ranAt: new Date().toISOString(),
    slaSwept: 0,
    autoClosed: 0,
    disputesBumped: 0,
    checkerReminders: 0,
    moneyMovementAging: 0,
    kycTasksCreated: 0,
    bridgeRetried: 0,
    notes: [],
  };

  /* 3.4 — SLA events + auto-close for every open ticket, not by chance. */
  try {
    report.slaSwept = await engine.sweepOpenTicketSlas();
    report.autoClosed = await engine.sweepAutoClose();
  } catch (e) {
    report.notes.push(`sla sweep failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  /* 3.3 — open disputes older than 72h climb one priority step (once). */
  try {
    const { data: aging, error } = await admin
      .from("support_disputes")
      .select("id, dispute_number, priority, customer_name, timeline, created_at")
      .in("status", AGING_DISPUTE_STATUSES)
      .lt("created_at", new Date(Date.now() - 72 * HOURS).toISOString())
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    for (const d of aging ?? []) {
      const next = DISPUTE_BUMP_LADDER[String(d.priority)];
      if (!next) continue;
      const hoursOld = Math.round((Date.now() - new Date(d.created_at).getTime()) / HOURS);
      const timeline = Array.isArray(d.timeline) ? [...(d.timeline as unknown[])] : [];
      timeline.push({
        label: `Aging sweep: priority ${d.priority} → ${next}`,
        detail: `Open without an outcome for ${hoursOld}h (policy: >72h).`,
        by: "Aging sweep",
        at: new Date().toISOString(),
      });
      const { error: updateErr } = await admin
        .from("support_disputes")
        .update({ priority: next, timeline })
        .eq("id", d.id)
        .eq("priority", d.priority); // optimistic guard: no double-bump on a race
      if (updateErr) {
        report.notes.push(`dispute ${d.dispute_number} bump failed: ${updateErr.message}`);
        continue;
      }
      report.disputesBumped += 1;
      await insertNotificationRow({
        type: "DISPUTE_UPDATE",
        title: `Aging dispute bumped to ${next}: ${d.dispute_number}`,
        body: `Open without an outcome for ${hoursOld}h (${d.customer_name ?? "customer not named"}).`,
        href: `/support/disputes/${d.id}`,
      });
    }
  } catch (e) {
    report.notes.push(`dispute aging failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  /* 3.3 — pending maker-checker requests older than 24h. */
  try {
    const { data: pending, error } = await admin
      .from("maker_checker_requests")
      .select("id, action_type, payload, created_at, checker_reminded_at")
      .eq("status", "PENDING")
      .lt("created_at", new Date(Date.now() - 24 * HOURS).toISOString())
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    for (const r of pending ?? []) {
      const hoursOld = Math.round((Date.now() - new Date(r.created_at).getTime()) / HOURS);
      if (r.action_type === "DISPUTE_FINANCIAL_DECISION") {
        if (r.checker_reminded_at) continue; // reminded once, ever
        const payload = (r.payload ?? {}) as Record<string, unknown>;
        const disputeId = String(payload.dispute_id ?? "");
        const disputeNumber = String(payload.dispute_number ?? "dispute");
        await insertNotificationRow({
          type: "DISPUTE_UPDATE",
          title: `Checker approval needed: ${disputeNumber}`,
          body: `The recorded financial decision has been waiting ${hoursOld}h for a second sign-off. Approving executes the posting; a second officer must review it.`,
          href: disputeId ? `/support/disputes/${disputeId}` : "/support/disputes",
        });
        await admin.from("maker_checker_requests").update({ checker_reminded_at: new Date().toISOString() }).eq("id", r.id);
        report.checkerReminders += 1;
      } else {
        // Money-movement requests are checked in the ADMIN console, which has
        // no notification bell. Counted and reported — never "notified" into
        // a surface that does not exist.
        report.moneyMovementAging += 1;
      }
    }
  } catch (e) {
    report.notes.push(`maker-checker aging failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  /* 3.3 — KYC documents nearing expiry: one task + one customer notification. */
  try {
    const { data: expiring, error } = await admin
      .from("customer_kyc_documents")
      .select("id, customer_id, document_type, expires_at")
      .not("expires_at", "is", null)
      .gte("expires_at", new Date().toISOString())
      .lte("expires_at", new Date(Date.now() + 30 * 24 * HOURS).toISOString())
      .neq("status", "REJECTED")
      .order("expires_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    for (const doc of expiring ?? []) {
      const sourceRef = `kyc-expiry:${doc.id}`;
      const { data: existing } = await admin
        .from("support_tasks")
        .select("id")
        .eq("source_ref", sourceRef)
        .limit(1);
      if (existing && existing.length > 0) continue; // one task per document, ever

      const daysLeft = Math.ceil((new Date(String(doc.expires_at)).getTime() - Date.now()) / (24 * HOURS));
      const expiresOn = String(doc.expires_at).slice(0, 10);
      const { error: taskErr } = await admin.from("support_tasks").insert({
        title: `KYC document expiring: ${doc.document_type}`,
        description: `Customer ${doc.customer_id}'s ${doc.document_type} expires on ${expiresOn} (${daysLeft} day${daysLeft === 1 ? "" : "s"}). Obtain a renewed document before it lapses. Created by the aging sweep.`,
        priority: daysLeft <= 7 ? "HIGH" : "MEDIUM",
        customer_id: doc.customer_id,
        due_at: doc.expires_at,
        status: "OPEN",
        source_ref: sourceRef,
      });
      if (taskErr) {
        report.notes.push(`kyc task for ${sourceRef} failed: ${taskErr.message}`);
        continue;
      }
      report.kycTasksCreated += 1;

      const { error: noteErr } = await admin.from("customer_notifications").insert({
        customer_id: doc.customer_id,
        category: "VERIFICATION",
        severity: daysLeft <= 7 ? "WARNING" : "INFO",
        title: `Your ${doc.document_type} expires soon`,
        body: `Your ${doc.document_type} on file expires on ${expiresOn} (${daysLeft} day${daysLeft === 1 ? "" : "s"}). Upload a renewed copy from your profile so your account stays fully verified.`,
        related_transaction_id: null,
        is_read: false,
      });
      if (noteErr) {
        report.notes.push(`kyc customer notification for ${sourceRef} failed: ${noteErr.message}`);
      }
    }
  } catch (e) {
    report.notes.push(`kyc expiry pass failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  /* 3.1 retry — bridge un-bridged open COMPLIANCE/FRAUD_RISK escalations. */
  try {
    const { data: unbridged, error } = await admin
      .from("support_escalations")
      .select("id, escalation_number, ticket_id, reason, priority, destination, status, sla_due_at, external_ref, created_at")
      .in("destination", ["COMPLIANCE", "FRAUD_RISK"])
      .neq("status", "RESOLVED")
      .is("external_ref", null)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    for (const esc of unbridged ?? []) {
      const { data: ticket } = await admin
        .from("support_tickets")
        .select("id, ticket_number, subject, customer_id, customer_name, customer_email, jurisdiction, related_transaction_reference")
        .eq("id", esc.ticket_id)
        .maybeSingle();
      if (!ticket) {
        report.notes.push(`bridge retry: ticket ${esc.ticket_id} for ${esc.escalation_number} not found`);
        continue;
      }
      const outcome = await bridgeEscalationToCompliance(
        {
          id: esc.id,
          escalationNumber: esc.escalation_number,
          ticketId: esc.ticket_id,
          destination: esc.destination,
          reason: esc.reason,
          priority: esc.priority,
          slaDueAt: esc.sla_due_at,
          externalRef: esc.external_ref,
        },
        {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          subject: ticket.subject,
          customerId: ticket.customer_id ?? null,
          customerName: ticket.customer_name ?? null,
          customerEmail: ticket.customer_email ?? null,
          jurisdiction: ticket.jurisdiction ?? null,
          relatedTransactionReference: ticket.related_transaction_reference ?? null,
        },
      );
      if (outcome.status === "bridged") report.bridgeRetried += 1;
      else if (outcome.status === "error") report.notes.push(`bridge retry for ${esc.escalation_number}: ${outcome.error}`);
    }
  } catch (e) {
    report.notes.push(`bridge retry failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  return report;
}
