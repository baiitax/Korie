import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { decideMoneyMovement } from "@/lib/security/moneyMovement";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/approvals — the pending money-movement approval queue.
 * POST /api/admin/approvals — record an approve/reject decision on a
 *      controlled money movement.
 *
 * Controlled movements (assessment §43, migration 20260914000051):
 *  - AGENT_FLOAT_TOPUP  : agent float top-ups; at/above the dual-control
 *    threshold (₦1,000,000 NGN default) a second, DIFFERENT reviewer must
 *    approve before treasury money moves. Statuses PENDING /
 *    PENDING_SECOND_APPROVAL.
 *  - MERCHANT_PAYOUT    : merchant payout requests; at/above the threshold
 *    (₦250,000 NGN default) no money moves until the required number of
 *    distinct internal approvers — none of them the requester — sign off.
 *    Status PENDING_APPROVAL.
 *  - ADASHI_PAYOUT      : Adashi/ROSCA payouts above the product-configured
 *    threshold (maker-checker enforced in authorize_adashi_payout since
 *    inception). Status PENDING.
 *  - CASH_VARIANCE      : agent end-of-day cash-count breaks (§16
 *    break-management, migration 20260914000052). A shortfall is already
 *    journaled — the agent's cash position is corrected and the missing
 *    value sits in SUSPENSE-<ccy> — and an overage is parked for review.
 *    The resolve action is the checker step (the agent who counted is the
 *    maker; the resolver here is back-office — SoD by construction).
 *    Statuses VARIANCE_JOURNALED / OVERAGE_PENDING_REVIEW → RESOLVED.
 *  - MONEY_MOVEMENT_REQUEST: settlement runs and agency-transaction
 *    reversals (B8 / RISK-13, migration 20260914000059). The maker surface
 *    (ops console, aggregator portal, merchant portal) only submits; the
 *    decision here executes run_daily_settlement / run_merchant_settlement
 *    / reverse_agency_transaction INSIDE the approval transaction. The
 *    database refuses self-approval (by id AND login email) and refuses a
 *    second decision; a failed execution rolls the whole approval back and
 *    the request stays PENDING.
 *
 * Every decision lands in control_approval_events (four-eyes audit trail)
 * and/or the movement's own event log. The RPCs enforce distinct approvers
 * and refuse self-approval — this route cannot bypass those guarantees.
 */

type QueueItem = {
  type: "AGENT_FLOAT_TOPUP" | "MERCHANT_PAYOUT" | "ADASHI_PAYOUT" | "CASH_VARIANCE" | "MONEY_MOVEMENT_REQUEST";
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  status: string;
  requested_at: string;
  approvals: number;
  required: number;
  detail?: string;
};

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
      { status: "error", error: { code: "APPROVALS_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  try {
    const queue: QueueItem[] = [];

    // 1. Agent float top-ups awaiting review (first or second approval).
    const { data: topups, error: topupErr } = await admin
      .from("agent_float_topup_requests")
      .select("id, agent_id, amount, currency, status, requested_at, agents(agent_name, email)")
      .in("status", ["PENDING", "PENDING_SECOND_APPROVAL"])
      .order("requested_at", { ascending: true })
      .limit(100);
    if (topupErr) throw topupErr;
    for (const t of topups ?? []) {
      const agent = Array.isArray(t.agents) ? t.agents[0] : t.agents;
      queue.push({
        type: "AGENT_FLOAT_TOPUP",
        id: t.id,
        title: `Float top-up — ${agent?.agent_name ?? t.agent_id}`,
        subtitle: `${t.status === "PENDING_SECOND_APPROVAL" ? "Second approval required (dual control)" : "First review"} · ${agent?.email ?? ""}`,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        requested_at: t.requested_at,
        approvals: 0, // filled below
        required: t.status === "PENDING_SECOND_APPROVAL" ? 2 : 1,
      });
    }

    // 2. Merchant payouts awaiting internal approval.
    const { data: payouts, error: payoutErr } = await admin
      .from("merchant_payout_requests")
      .select("id, merchant_id, amount, currency, status, created_at, merchant_profiles(business_name)")
      .eq("status", "PENDING_APPROVAL")
      .order("created_at", { ascending: true })
      .limit(100);
    if (payoutErr) throw payoutErr;
    for (const p of payouts ?? []) {
      const merchant = Array.isArray(p.merchant_profiles) ? p.merchant_profiles[0] : p.merchant_profiles;
      queue.push({
        type: "MERCHANT_PAYOUT",
        id: p.id,
        title: `Merchant payout — ${merchant?.business_name ?? p.merchant_id}`,
        subtitle: "Dual-control payout: distinct internal approvers required; requester cannot approve",
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        requested_at: p.created_at,
        approvals: 0,
        required: 2,
      });
    }

    // 3. Adashi payouts awaiting the checker.
    const { data: adashi, error: adashiErr } = await admin
      .schema("adashi")
      .from("payouts")
      .select("id, group_id, gross_amount, currency, status, created_at, groups(name)")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(100);
    if (adashiErr) throw adashiErr;
    for (const p of adashi ?? []) {
      const group = Array.isArray(p.groups) ? p.groups[0] : p.groups;
      queue.push({
        type: "ADASHI_PAYOUT",
        id: p.id,
        title: `Adashi payout — ${group?.name ?? p.group_id}`,
        subtitle: "Maker-checker payout: a second person must authorize disbursement",
        amount: Number(p.gross_amount),
        currency: p.currency,
        status: p.status,
        requested_at: p.created_at,
        approvals: 0,
        required: 2,
      });
    }

    // 4. Agent cash-count breaks awaiting back-office resolution (§16).
    const { data: variances, error: varianceErr } = await admin
      .from("agent_cash_reconciliations")
      .select("id, agent_id, reconciliation_date, currency, opening_cash, today_cash_in, today_cash_out, expected_closing_cash, actual_physical_cash, difference, status, notes, submitted_at, agents(agent_name, email)")
      .in("status", ["VARIANCE_JOURNALED", "OVERAGE_PENDING_REVIEW"])
      .order("submitted_at", { ascending: true })
      .limit(100);
    if (varianceErr) throw varianceErr;
    for (const v of variances ?? []) {
      const agent = Array.isArray(v.agents) ? v.agents[0] : v.agents;
      const isShort = Number(v.difference) < 0;
      queue.push({
        type: "CASH_VARIANCE",
        id: v.id,
        title: `${isShort ? "Cash shortfall" : "Cash overage"} — ${agent?.agent_name ?? v.agent_id}`,
        subtitle: isShort
          ? "Shortfall journaled: agent position corrected, missing value in suspense — resolve when the investigation closes"
          : "Overage parked for review: no ledger value was created — document the source, return it, or forfeit it",
        amount: Math.abs(Number(v.difference)),
        currency: v.currency,
        status: v.status,
        requested_at: v.submitted_at,
        approvals: 0,
        required: 1,
        detail: `Count ${Number(v.actual_physical_cash).toLocaleString()} vs expected ${Number(v.expected_closing_cash).toLocaleString()} ${v.currency} · ${v.reconciliation_date}${v.notes ? ` · ${v.notes}` : ""}`,
      });
    }

    // 5. Money-movement requests awaiting the checker (settlement runs and
    //    agency-transaction reversals — B8 / RISK-13).
    const { data: movements, error: movementErr } = await admin
      .from("maker_checker_requests")
      .select("id, action_type, status, maker_email, maker_role, maker_notes, payload, execution_result, created_at")
      .in("action_type", ["AGENCY_SETTLEMENT_RUN", "MERCHANT_SETTLEMENT_RUN", "AGENCY_TRANSACTION_REVERSAL"])
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(100);
    if (movementErr) throw movementErr;
    // Display context so the checker sees WHAT they are approving.
    const mmOrgIds = new Set<string>();
    const mmMerchantIds = new Set<string>();
    const mmTxnIds = new Set<string>();
    for (const m of movements ?? []) {
      const p = (m.payload ?? {}) as Record<string, unknown>;
      if (typeof p.org_id === "string") mmOrgIds.add(p.org_id);
      if (typeof p.merchant_id === "string") mmMerchantIds.add(p.merchant_id);
      if (typeof p.transaction_id === "string") mmTxnIds.add(p.transaction_id);
    }
    const [mmOrgs, mmMerchants, mmTxns] = await Promise.all([
      mmOrgIds.size
        ? admin.from("organizations").select("id, name").in("id", Array.from(mmOrgIds))
        : Promise.resolve({ data: [] as any[] }),
      mmMerchantIds.size
        ? admin.from("merchant_profiles").select("id, business_name").in("id", Array.from(mmMerchantIds))
        : Promise.resolve({ data: [] as any[] }),
      mmTxnIds.size
        ? admin.from("agency_transactions").select("id, reference, amount, currency, status, customer_name, created_at").in("id", Array.from(mmTxnIds))
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const mmOrgNames = new Map<string, string>((mmOrgs.data ?? []).map((o: any) => [o.id, o.name]));
    const mmMerchantNames = new Map<string, string>((mmMerchants.data ?? []).map((m: any) => [m.id, m.business_name]));
    const mmTxnMap = new Map<string, any>((mmTxns.data ?? []).map((t: any) => [t.id, t]));
    for (const m of movements ?? []) {
      const p = (m.payload ?? {}) as Record<string, unknown>;
      const pOrgId = typeof p.org_id === "string" ? p.org_id : null;
      const pMerchantId = typeof p.merchant_id === "string" ? p.merchant_id : null;
      const pTxnId = typeof p.transaction_id === "string" ? p.transaction_id : null;
      const txn = pTxnId ? mmTxnMap.get(pTxnId) : null;
      const scope =
        pOrgId && mmOrgNames.get(pOrgId)
          ? `Org ${mmOrgNames.get(pOrgId)}`
          : pMerchantId && mmMerchantNames.get(pMerchantId)
            ? `Merchant ${mmMerchantNames.get(pMerchantId)}`
            : txn
              ? `Txn ${txn.reference}`
              : "";
      const titles: Record<string, string> = {
        AGENCY_SETTLEMENT_RUN: `Agent-commission settlement run — ${scope}`,
        MERCHANT_SETTLEMENT_RUN: `Merchant settlement run — ${scope}`,
        AGENCY_TRANSACTION_REVERSAL: `Transaction reversal — ${txn ? `${txn.reference} · ${Number(txn.amount).toLocaleString()} ${txn.currency} (${txn.status})` : scope}`,
      };
      queue.push({
        type: "MONEY_MOVEMENT_REQUEST",
        id: m.id,
        title: titles[m.action_type] ?? `${m.action_type} — ${scope}`,
        subtitle: `Maker: ${m.maker_email} (${m.maker_role})${m.maker_notes ? ` · ${m.maker_notes}` : ""}${typeof p.reason === "string" ? ` · Reason: ${p.reason}` : ""}`,
        amount: txn ? Number(txn.amount) : 0,
        currency: (p.currency as string) ?? (txn?.currency as string) ?? "",
        status: m.status,
        requested_at: m.created_at,
        approvals: 0,
        required: 2, // maker (done) + this checker — the DB refuses the maker as checker
        detail: JSON.stringify(m.payload),
      });
    }

    // Approval counts for every queued item (distinct approvers so far).
    const ids = queue.map((q) => q.id);
    if (ids.length > 0) {
      const { data: events } = await admin
        .from("control_approval_events")
        .select("approval_type, reference_id, actor_id")
        .eq("decision", "APPROVE")
        .in("reference_id", ids);
      const counts = new Map<string, number>();
      const seenActor = new Set<string>();
      for (const e of events ?? []) {
        const key = `${e.approval_type}:${e.reference_id}`;
        const actorKey = `${key}:${e.actor_id}`;
        if (!seenActor.has(actorKey)) {
          seenActor.add(actorKey);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      for (const q of queue) {
        q.approvals = counts.get(`${q.type}:${q.id}`) ?? 0;
      }
    }

    return NextResponse.json({ status: "ok", queue });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: { code: "APPROVAL_QUEUE_FAILED", message: err instanceof Error ? err.message : "The approval queue did not load." } },
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

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "APPROVALS_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." } },
      { status: 503 },
    );
  }

  let body: { type?: string; id?: string; decision?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "INVALID_JSON", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const { type, id, decision, notes, resolution } = body as typeof body & { resolution?: string };
  if (![`AGENT_FLOAT_TOPUP`, `MERCHANT_PAYOUT`, `ADASHI_PAYOUT`, `CASH_VARIANCE`, `MONEY_MOVEMENT_REQUEST`].includes(type ?? ``)) {
    return NextResponse.json({ status: "error", error: { code: "INVALID_TYPE", message: "type must be AGENT_FLOAT_TOPUP, MERCHANT_PAYOUT, ADASHI_PAYOUT, CASH_VARIANCE or MONEY_MOVEMENT_REQUEST." } }, { status: 400 });
  }
  const CASH_VARIANCE_RESOLUTIONS = [
    `RECOVERED_TO_TILL`, `WRITTEN_OFF`, `DOCUMENTED_AS_MISSED_TRANSACTION`, `RETURNED_TO_SENDER`, `FORFEITED_TO_INCOME`,
  ];
  if (type === `CASH_VARIANCE`) {
    if (!CASH_VARIANCE_RESOLUTIONS.includes(resolution ?? ``)) {
      return NextResponse.json({ status: "error", error: { code: "INVALID_RESOLUTION", message: `resolution must be one of ${CASH_VARIANCE_RESOLUTIONS.join(", ")}.` } }, { status: 400 });
    }
  } else if (type === `MONEY_MOVEMENT_REQUEST`) {
    if (![`APPROVE`, `REJECT`].includes(decision ?? ``)) {
      return NextResponse.json({ status: "error", error: { code: "INVALID_DECISION", message: "decision must be APPROVE or REJECT." } }, { status: 400 });
    }
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ status: "error", error: { code: "INVALID_ID", message: "A valid money-movement request id is required." } }, { status: 400 });
    }
    if ((notes ?? ``).trim().length < 10) {
      return NextResponse.json({ status: "error", error: { code: "DECISION_NOTES_REQUIRED", message: "A meaningful note (at least 10 characters) is required for the audit trail." } }, { status: 400 });
    }
  } else if (![`APPROVE`, `REJECT`].includes(decision ?? ``)) {
    return NextResponse.json({ status: "error", error: { code: "INVALID_DECISION", message: "decision must be APPROVE or REJECT." } }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ status: "error", error: { code: "INVALID_ID", message: "id is required." } }, { status: 400 });
  }

  const actorId = auth.userId ?? "";
  const actorEmail = (auth as { email?: string }).email ?? "admin-console";

  try {
    let result: Record<string, unknown> | null = null;

    if (type === "MONEY_MOVEMENT_REQUEST") {
      // The checker step for settlement runs and agency-transaction
      // reversals. APPROVE executes the underlying run/reversal inside the
      // approval transaction (the shared module dispatches the merchant
      // settlement.completed webhook after a successful execution). The
      // database refuses self-approval (id AND login email) and a second
      // decision — those surface as 409s below.
      const decided = await decideMoneyMovement({
        requestId: id as string,
        checkerId: actorId || null,
        checkerEmail: actorEmail,
        decision: decision as "APPROVE" | "REJECT",
        notes: (notes ?? ``).trim() || undefined,
      });
      if (!decided.ok) {
        const conflict =
          decided.code === "SELF_APPROVAL_FORBIDDEN" ||
          decided.code === "ALREADY_DECIDED";
        return NextResponse.json(
          { status: "error", error: { code: conflict ? "DECISION_CONFLICT" : "DECISION_FAILED", message: decided.message } },
          { status: conflict ? 409 : decided.httpStatus },
        );
      }
      result = decided.result as unknown as Record<string, unknown>;
    } else if (type === "AGENT_FLOAT_TOPUP") {
      if (decision === "APPROVE") {
        const { data, error } = await admin.rpc("approve_agent_float_topup", {
          p_request_id: id,
          p_reviewer_id: actorId,
        });
        if (error) throw error;
        result = data as Record<string, unknown>;
      } else {
        // Reject mirrors the existing ops decision path: row-level status
        // change plus a control_approval_events entry for the audit trail.
        const { data: updated, error } = await admin
          .from("agent_float_topup_requests")
          .update({ status: "REJECTED", reviewed_by: actorId, reviewed_at: new Date().toISOString(), notes: notes ?? null })
          .eq("id", id)
          .in("status", ["PENDING", "PENDING_SECOND_APPROVAL"])
          .select()
          .single();
        if (error || !updated) throw error ?? new Error("TOPUP_REJECT_FAILED");
        await admin.rpc("record_control_approval", {
          p_approval_type: "AGENT_FLOAT_TOPUP",
          p_reference_id: id,
          p_actor_id: actorId,
          p_decision: "REJECT",
          p_notes: notes ?? "Rejected from approvals console",
          p_actor_role: "BACK_OFFICE",
        });
        result = updated as Record<string, unknown>;
      }
    } else if (type === "MERCHANT_PAYOUT") {
      const { data, error } = await admin.rpc("approve_merchant_payout", {
        p_request_id: id,
        p_approver_id: actorId,
        p_decision: decision,
        p_notes: notes ?? null,
      });
      if (error) throw error;
      result = data as Record<string, unknown>;
    } else if (type === "CASH_VARIANCE") {
      // The checker step of the reconciliation break workflow: resolve the
      // cash variance on the books. SoD holds by construction — the agent
      // submitted the count, a back-office reviewer resolves it here.
      const { data, error } = await admin.rpc("resolve_cash_variance", {
        p_reconciliation_id: id,
        p_resolution: resolution,
        p_posted_by: actorEmail,
        p_notes: notes ?? null,
      });
      if (error) throw error;
      result = data as Record<string, unknown>;
    } else {
      const { data, error } = await admin.rpc("authorize_adashi_payout", {
        p_payout_id: id,
        p_checker_id: actorId,
        p_checker_role: auth.roleName || "ADMIN",
        p_decision: decision === "APPROVE" ? "APPROVE" : "REJECT",
        p_notes: notes ?? null,
      });
      if (error) throw error;
      result = data as Record<string, unknown>;
    }

    return NextResponse.json({
      status: "ok",
      decision: { type, id, decision: type === "CASH_VARIANCE" ? `RESOLVE:${resolution}` : decision, actor: actorEmail, result },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The decision did not complete.";
    const conflict =
      message.includes("SEGREGATION_OF_DUTIES_VIOLATION") ||
      message.includes("SECOND_APPROVER_MUST_BE_A_DIFFERENT_USER") ||
      message.includes("ALREADY_DECIDED") ||
      message.includes("NOT_PENDING") ||
      message.includes("RECONCILIATION_NOT_RESOLVABLE_STATUS") ||
      message.includes("INVALID_RESOLUTION_FOR");
    return NextResponse.json(
      { status: "error", error: { code: conflict ? "DECISION_CONFLICT" : "DECISION_FAILED", message } },
      { status: conflict ? 409 : 500 },
    );
  }
}
