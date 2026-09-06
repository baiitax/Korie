import { NextRequest, NextResponse } from "next/server";
import { authorizeComplianceRequest, COMPLIANCE_WRITE_ROLES } from "@/lib/security/complianceAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RiskDecisionEngine } from "@/lib/risk/RiskDecisionEngine";
import { AmlScreeningProvider } from "@/lib/aml/AmlScreeningProvider";
import type { RiskEvaluationRequest } from "@/types/riskEngine";

export const dynamic = "force-dynamic";

/**
 * POST /api/compliance/actions/[action] — the compliance portal's workflow
 * transitions that are more than a single-column PATCH:
 *
 *   alert-convert   → open an AML case from an alert (links case_id)
 *   case-note       → append an investigation note to a case
 *
 * Both are audited in audit_events with the acting officer's identity.
 */

/**
 * audit_events carries NOT NULL ip/request/correlation columns; every action
 * writes the full row with the acting officer's verified identity.
 */
async function audit(
  admin: any,
  auth: { profileId?: string; userId?: string; orgId?: string; roleName?: string; email?: string },
  request: NextRequest,
  row: {
    action: string;
    resource_type: string;
    resource_id: string;
    details?: unknown;
    before_state?: unknown;
    after_state?: unknown;
  },
) {
  const requestId =
    request.headers.get("x-kp-request-id") ??
    request.headers.get("x-request-id") ??
    `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await admin.from("audit_events").insert({
    org_id: auth.orgId ?? null,
    actor_id: auth.profileId ?? auth.userId ?? "00000000-0000-0000-0000-000000000000",
    actor_email: auth.email ?? "unknown",
    actor_role: auth.roleName ?? "UNKNOWN",
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    details: row.details ?? {},
    before_state: row.before_state ?? null,
    after_state: row.after_state ?? null,
    ip_address: request.headers.get("x-forwarded-for") ?? "unrecorded",
    request_id: requestId,
    correlation_id: requestId,
  });
}

interface ConvertBody {
  alertId?: string;
  priority?: string;
  rationale?: string;
}

interface NoteBody {
  caseId?: string;
  content?: string;
  noteType?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { action: string } },
) {
  const auth = await authorizeComplianceRequest(request, COMPLIANCE_WRITE_ROLES);
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
      {
        status: "error",
        error: { code: "COMPLIANCE_BACKEND_NOT_CONFIGURED", message: "Missing Supabase credentials." },
      },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "INVALID_BODY", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  if (params.action === "alert-convert") {
    const { alertId, priority, rationale } = body as ConvertBody;
    if (!alertId) {
      return NextResponse.json(
        { status: "error", error: { code: "MISSING_ALERT_ID", message: "alertId is required." } },
        { status: 400 },
      );
    }

    const { data: alert, error: alertErr } = await admin
      .from("aml_alerts")
      .select("id, alert_reference, customer_id, jurisdiction, severity, status, currency, why_suspicious, case_id")
      .eq("id", alertId)
      .maybeSingle();
    if (alertErr || !alert) {
      return NextResponse.json(
        { status: "error", error: { code: "ALERT_NOT_FOUND", message: "That alert no longer exists." } },
        { status: 404 },
      );
    }
    if (alert.status === "CLOSED" || alert.case_id) {
      return NextResponse.json(
        { status: "error", error: { code: "ALERT_ALREADY_DISPOSED", message: "This alert is already converted or closed." } },
        { status: 409 },
      );
    }

    const caseReference = `AML-CASE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { data: newCase, error: caseErr } = await admin
      .from("aml_cases")
      .insert({
        case_reference: caseReference,
        primary_customer_id: alert.customer_id,
        jurisdiction: alert.jurisdiction ?? "NG",
        priority: priority ?? alert.severity ?? "MEDIUM",
        status: "OPEN",
        currency: alert.currency ?? "NGN",
        lead_investigator: auth.email ?? undefined,
      })
      .select()
      .single();
    if (caseErr || !newCase) {
      return NextResponse.json(
        { status: "error", error: { code: "CASE_CREATE_FAILED", message: caseErr?.message ?? "Could not open the case." } },
        { status: 400 },
      );
    }

    const { error: linkErr } = await admin.from("aml_alerts").update({ case_id: newCase.id, status: "CONVERTED_TO_CASE" }).eq("id", alertId);
    if (linkErr) {
      // The case exists but the link failed — report honestly, do not pretend.
      return NextResponse.json(
        { status: "error", error: { code: "LINK_FAILED", message: `Case ${caseReference} was opened but the alert link failed: ${linkErr.message}` } },
        { status: 500 },
      );
    }

    if (rationale) {
      await admin.from("aml_case_notes").insert({
        case_id: newCase.id,
        author_email: auth.email ?? "unknown",
        note_type: "CONVERSION",
        content: rationale,
      });
    }

    await audit(admin, auth, request, {
      action: "AML_ALERT_CONVERTED_TO_CASE",
      resource_type: "compliance:aml-cases",
      resource_id: newCase.id,
      details: { alertId, caseReference, rationale },
      before_state: alert,
      after_state: newCase,
    });

    return NextResponse.json({ status: "ok", case: newCase });
  }

  if (params.action === "case-note") {
    const { caseId, content, noteType } = body as NoteBody;
    if (!caseId || !content) {
      return NextResponse.json(
        { status: "error", error: { code: "MISSING_FIELDS", message: "caseId and content are required." } },
        { status: 400 },
      );
    }

    const { data: exists } = await admin.from("aml_cases").select("id, case_reference").eq("id", caseId).maybeSingle();
    if (!exists) {
      return NextResponse.json(
        { status: "error", error: { code: "CASE_NOT_FOUND", message: "That case no longer exists." } },
        { status: 404 },
      );
    }

    const { data: note, error: noteErr } = await admin
      .from("aml_case_notes")
      .insert({
        case_id: caseId,
        author_email: auth.email ?? "unknown",
        note_type: noteType ?? "INVESTIGATION",
        content,
      })
      .select()
      .single();
    if (noteErr || !note) {
      return NextResponse.json(
        { status: "error", error: { code: "NOTE_FAILED", message: noteErr?.message ?? "Could not save the note." } },
        { status: 400 },
      );
    }

    await audit(admin, auth, request, {
      action: "AML_CASE_NOTE_ADDED",
      resource_type: "compliance:aml-cases",
      resource_id: caseId,
      details: { noteId: note.id, noteType: note.note_type },
      after_state: note,
    });

    return NextResponse.json({ status: "ok", note });
  }

  if (params.action === "risk-evaluate") {
    const { transactionReference, entityId, amountMinor, currency, countryCode, entityType, transactionType } = body as {
      transactionReference?: string; entityId?: string; amountMinor?: number; currency?: string;
      countryCode?: string; entityType?: string; transactionType?: string;
    };
    if (!transactionReference || !entityId || !amountMinor) {
      return NextResponse.json(
        { status: "error", error: { code: "MISSING_FIELDS", message: "transactionReference, entityId and amountMinor are required." } },
        { status: 400 },
      );
    }
    const evaluation = {
      transactionReference, entityId,
      entityType: entityType || "CUSTOMER",
      amountMinor, currency: currency || "NGN",
      countryCode: countryCode || "NG",
      transactionType,
    } as unknown as RiskEvaluationRequest;
    let decision: Record<string, unknown>;
    try {
      decision = RiskDecisionEngine.evaluateTransaction(evaluation) as unknown as Record<string, unknown>;
    } catch (err) {
      return NextResponse.json(
        { status: "error", error: { code: "EVALUATION_FAILED", message: err instanceof Error ? err.message : "The risk engine did not return a decision." } },
        { status: 500 },
      );
    }

    // Persist the decision so the monitoring feed and audit trail carry it.
    const { data: stored, error: storeErr } = await admin
      .from("risk_decisions")
      .insert({
        transaction_reference: transactionReference,
        entity_id: entityId,
        composite_score: (decision as { compositeScore?: number }).compositeScore ?? null,
        risk_band: (decision as { riskBand?: string }).riskBand ?? null,
        decision: (decision as { decision?: string }).decision ?? null,
        decision_reason: (decision as { reason?: string }).reason ?? null,
        policy_version: (decision as { policyVersion?: string }).policyVersion ?? null,
        model_version: (decision as { modelVersion?: string }).modelVersion ?? null,
        execution_latency_ms: (decision as { executionLatencyMs?: number }).executionLatencyMs ?? null,
        rule_hits: (decision as { ruleHits?: unknown }).ruleHits ?? null,
      })
      .select()
      .single();

    await audit(admin, auth, request, {
      action: "RISK_EVALUATION_RUN",
      resource_type: "compliance:risk-decisions",
      resource_id: stored?.id ?? transactionReference,
      details: { transactionReference, entityId, amountMinor, persisted: !storeErr },
      after_state: stored ?? decision,
    });

    if (storeErr) {
      return NextResponse.json({ status: "error", error: { code: "PERSIST_FAILED", message: `The engine decided but the decision could not be stored: ${storeErr.message}` } }, { status: 500 });
    }
    return NextResponse.json({ status: "ok", decision: stored ?? decision });
  }

  if (params.action === "screening") {
    const { name, jurisdiction } = body as { name?: string; jurisdiction?: string };
    if (!name) {
      return NextResponse.json(
        { status: "error", error: { code: "MISSING_FIELDS", message: "name is required." } },
        { status: 400 },
      );
    }
    let result: Record<string, unknown>;
    try {
      result = (await AmlScreeningProvider.getInstance().screenEntity(name, (jurisdiction || "NG") as "NG" | "NE")) as unknown as Record<string, unknown>;
    } catch (err) {
      return NextResponse.json(
        { status: "error", error: { code: "SCREENING_FAILED", message: err instanceof Error ? err.message : "The screening provider did not answer." } },
        { status: 500 },
      );
    }
    // Screening results are transient: no table stores a standing match list,
    // so the run is audited and the result returned, never fabricated later.
    await audit(admin, auth, request, {
      action: "AML_SCREENING_RUN",
      resource_type: "compliance:screening",
      resource_id: name,
      details: { jurisdiction: jurisdiction || "NG" },
      after_state: result,
    });
    return NextResponse.json({ status: "ok", screening: result });
  }

  return NextResponse.json(
    { status: "error", error: { code: "UNKNOWN_ACTION", message: `Unknown compliance action "${params.action}".` } },
    { status: 404 },
  );
}
