import { NextRequest } from "next/server";
import { requireSupportAccess, operationalError } from "@/lib/support/supportApi";
import { hasCapability } from "@/lib/support/SupportPermissions";
import {
  decideDisputeDecisionRequest,
  insertCustomerNotificationRow,
  buildDisputeOutcomeNotification,
} from "@/lib/support/supportDb";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSuccessResponse } from "@/lib/security/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET  /api/support/approvals — the CHECKER queue for dispute financial
 *      decisions (portal roadmap PS-2, migration 20260914000062).
 * POST /api/support/approvals — decide one: APPROVE executes
 *      post_dispute_resolution INSIDE the approval transaction (the journal
 *      posts only if the whole approval commits), REJECT closes the request
 *      without touching anything.
 *
 * Every financial dispute decision (REFUND_APPROVED / REVERSAL_APPROVED /
 * PARTIAL_REFUND) is submitted by a maker (the decision owner role, a
 * Support Manager or a Super Admin) and must be approved by a DIFFERENT
 * officer — the dispute's decision-owner role, a Support Manager, a Super
 * Admin, or the Support Supervisor. The database refuses self-approval (by
 * officer id AND login email) and any second decision on the same request.
 */

export async function GET(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:read");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "view_transactions")) {
    return operationalError("FORBIDDEN", "Your role cannot view the refund checker queue.", 403, access.ctx.requestId);
  }

  const admin = getSupabaseAdminClient();

  // Pending requests + recent decisions for context.
  const { data: requests, error } = await admin
    .from("maker_checker_requests")
    .select("id, action_type, status, maker_email, maker_role, maker_notes, payload, checker_email, checker_notes, execution_result, created_at, approved_at, rejected_at, executed_at")
    .eq("action_type", "DISPUTE_FINANCIAL_DECISION")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return operationalError("APPROVALS_QUEUE_FAILED", error.message, 500, access.ctx.requestId);
  }

  // Dispute context so the checker sees WHAT they are approving.
  const disputeIds = (requests ?? [])
    .map((r: any) => (r.payload?.dispute_id ? String(r.payload.dispute_id) : null))
    .filter(Boolean) as string[];
  const { data: disputes } = disputeIds.length
    ? await admin
        .from("support_disputes")
        .select("id, dispute_number, category, status, priority, transaction_reference, customer_name, jurisdiction, claim, claim_amount, currency, decision_type, recovery_case_reference, created_at")
        .in("id", disputeIds)
    : { data: [] as any[] };
  const disputeMap = new Map<string, any>((disputes ?? []).map((d: any) => [d.id, d]));

  const queue = (requests ?? []).map((r: any) => {
    const d = r.payload?.dispute_id ? disputeMap.get(String(r.payload.dispute_id)) : null;
    return {
      id: r.id,
      status: r.status,
      maker_email: r.maker_email,
      maker_role: r.maker_role,
      maker_notes: r.maker_notes,
      payload: r.payload,
      checker_email: r.checker_email,
      checker_notes: r.checker_notes,
      execution_result: r.execution_result,
      created_at: r.created_at,
      decided_at: r.executed_at ?? r.rejected_at ?? r.approved_at ?? null,
      dispute: d
        ? {
            dispute_number: d.dispute_number,
            category: d.category,
            status: d.status,
            priority: d.priority,
            transaction_reference: d.transaction_reference,
            customer_name: d.customer_name,
            jurisdiction: d.jurisdiction,
            claim: d.claim,
            claim_amount: Number(d.claim_amount),
            currency: d.currency,
            decision_type: d.decision_type,
            recovery_case_reference: d.recovery_case_reference,
          }
        : null,
    };
  });

  const pending = queue.filter((q) => q.status === "PENDING");
  const canCheck =
    hasCapability(access.ctx.actor.role, "decide_dispute") || access.ctx.actor.role === "SUPPORT_SUPERVISOR";

  return createSuccessResponse(
    {
      requests: queue,
      pending_count: pending.length,
      can_check_as: access.ctx.officer.email,
      can_check: canCheck,
      note: "Approving executes the refund/reversal inside the approval transaction. Self-approval is refused by the database.",
    },
    { requestId: access.ctx.requestId, code: "DISPUTE_APPROVALS_LOADED" },
  );
}

export async function POST(req: NextRequest) {
  const access = await requireSupportAccess(req, "support:write");
  if (!access.ok) return access.response;
  if (!hasCapability(access.ctx.actor.role, "decide_dispute") && access.ctx.actor.role !== "SUPPORT_SUPERVISOR") {
    return operationalError("FORBIDDEN", "Your role cannot check dispute financial decisions.", 403, access.ctx.requestId);
  }

  let body: { request_id?: string; decision?: string; notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const requestId = (body.request_id ?? "").trim();
  const decision = (body.decision ?? "").trim().toUpperCase();
  const notes = (body.notes ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return operationalError("INVALID_REQUEST_ID", "A valid request_id is required.", 400, access.ctx.requestId);
  }
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return operationalError("INVALID_DECISION", "decision must be APPROVE or REJECT.", 400, access.ctx.requestId);
  }
  if (notes.length < 20) {
    return operationalError("DECISION_NOTES_REQUIRED", "A meaningful note (at least 20 characters) is required for the audit trail.", 422, access.ctx.requestId);
  }

  try {
    const result = await decideDisputeDecisionRequest({
      requestId,
      checkerOfficerId: access.ctx.officer.id,
      checkerEmail: access.ctx.officer.email,
      decision,
      notes,
    });

    /*
     * PS-9 (roadmap 3.2): when the checker APPROVES, the wallet credit has
     * posted inside the approval transaction — that is the moment the
     * customer's bell is told the outcome. A checker REJECT returns the
     * dispute to undecided (the maker may resubmit), so the customer is not
     * told anything. A notification failure must not misreport an executed
     * approval — the response says whether the customer was reached.
     */
    let customerNotified = false;
    if (result.status === "EXECUTED") {
      try {
        /*
         * The RPC returns the maker payload (customer, dispute number) and
         * the execution result, whose posted_amount/posted_currency are what
         * the ledger actually credited (post_dispute_resolution re-derives
         * them from the transaction — the claim amount is never trusted).
         */
        const payload = (result.payload ?? {}) as Record<string, unknown>;
        const posted = (result.execution_result ?? {}) as Record<string, unknown>;
        const customerId = String(payload.customer_id ?? "");
        const disputeNumber = String(posted.dispute_number ?? payload.dispute_number ?? "");
        if (customerId && disputeNumber) {
          const postedAmount = Number(posted.posted_amount);
          const note = buildDisputeOutcomeNotification({
            disputeNumber,
            transactionReference: (posted.transaction_reference ?? payload.transaction_reference) as string | null,
            decisionType: String(posted.decision_type ?? payload.decision_type ?? ""),
            currency: (posted.posted_currency ?? null) as string | null,
            approvedAmount: Number.isFinite(postedAmount) ? postedAmount : null,
            recoveryCaseReference: (posted.recovery_reference ?? null) as string | null,
          });
          await insertCustomerNotificationRow({
            customerId,
            // The customer_notifications category enum is closed
          // (TRANSACTION/VERIFICATION/SECURITY/SYSTEM/SUPPORT) — dispute
          // outcomes are support-domain notifications.
          category: "SUPPORT",
            severity: note.severity,
            title: note.title,
            body: note.body,
          });
          customerNotified = true;
        }
      } catch {
        customerNotified = false;
      }
    }

    return createSuccessResponse(
      {
        request_id: result.request_id,
        status: result.status,
        execution_result: result.execution_result ?? null,
        decided_by: access.ctx.officer.email,
        customer_notified: customerNotified,
      },
      {
        requestId: access.ctx.requestId,
        code: result.status === "EXECUTED" ? "DISPUTE_DECISION_EXECUTED" : "DISPUTE_DECISION_REJECTED",
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "The decision did not complete.";
    const conflict =
      message.includes("MAKER_CHECKER_SELF_APPROVAL_FORBIDDEN") ||
      message.includes("MAKER_CHECKER_REQUEST_ALREADY_DECIDED") ||
      message.includes("DISPUTE_REQUEST_ALREADY_PENDING") ||
      message.includes("DISPUTE_TRANSACTION_ALREADY_RESOLVED") ||
      message.includes("DISPUTE_ALREADY_DECIDED");
    return operationalError(
      conflict ? "DECISION_CONFLICT" : message.includes("NOT_ELIGIBLE") || message.includes("NOT_FOUND") ? "FORBIDDEN_OR_MISSING" : "DECISION_FAILED",
      message,
      conflict ? 409 : message.includes("NOT_ELIGIBLE") ? 403 : message.includes("NOT_FOUND") ? 404 : 500,
      access.ctx.requestId,
    );
  }
}
