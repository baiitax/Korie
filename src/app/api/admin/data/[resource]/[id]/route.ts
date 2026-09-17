import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESOURCES } from "@/lib/admin/resourceRegistry";
import { requiresOrgScoping } from "@/lib/security/orgScope";
import { requireAdminMfaForMutation } from "@/lib/security/adminMfa";

export const dynamic = "force-dynamic";

/**
 * GET    /api/admin/data/[resource]/[id] — single record from the registry.
 * PATCH  /api/admin/data/[resource]/[id] — audited mutation. Only columns
 *        whitelisted in the registry's `mutations` may be set, and only by
 *        full admin roles. Every PATCH writes an audit_events row with
 *        before/after state, so admin actions are traceable.
 */

function tableFor(admin: any, table: string) {
  if (table.includes(".")) {
    const [schema, name] = table.split(".");
    return admin.schema(schema).from(name);
  }
  return admin.from(table);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { resource: string; id: string } },
) {
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
      {
        status: "error",
        error: { code: "ADMIN_BACKEND_NOT_CONFIGURED", message: "The admin backend is not configured on this deployment (missing Supabase credentials)." },
      },
      { status: 503 },
    );
  }

  const def = RESOURCES[params.resource];
  if (!def) {
    return NextResponse.json(
      { status: "error", error: { code: "UNKNOWN_RESOURCE", message: `Resource "${params.resource}" is not registered.` } },
      { status: 404 },
    );
  }

  if (requiresOrgScoping(auth.roleName) && (!def.orgScopeColumn || !auth.orgId)) {
    return NextResponse.json(
      { status: "error", error: { code: "ORG_SCOPE_REQUIRED", message: "This resource cannot be scoped to your organization and is not available to your role." } },
      { status: 403 },
    );
  }

  let query = tableFor(admin, def.table).select(def.select ?? "*").eq("id", params.id);
  if (requiresOrgScoping(auth.roleName) && def.orgScopeColumn) {
    query = query.eq(def.orgScopeColumn, auth.orgId);
  }
  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json(
      { status: "error", error: { code: "RESOURCE_QUERY_FAILED", message: error.message } },
      { status: 400 },
    );
  }
  // A row owned by another tenant must 404 exactly like a missing row —
  // never distinguishably reveal that another org's record exists.
  if (!data) {
    return NextResponse.json(
      { status: "error", error: { code: "NOT_FOUND", message: `Record ${params.id} not found in ${params.resource}.` } },
      { status: 404 },
    );
  }
  return NextResponse.json({ status: "ok", resource: params.resource, record: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { resource: string; id: string } },
) {
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
      {
        status: "error",
        error: { code: "ADMIN_BACKEND_NOT_CONFIGURED", message: "The admin backend is not configured on this deployment (missing Supabase credentials)." },
      },
      { status: 503 },
    );
  }

  const def = RESOURCES[params.resource];
  if (!def?.mutations) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "MUTATION_NOT_ALLOWED", message: `Resource "${params.resource}" does not allow admin mutations.` },
      },
      { status: 403 },
    );
  }

  if (requiresOrgScoping(auth.roleName) && (!def.orgScopeColumn || !auth.orgId)) {
    return NextResponse.json(
      { status: "error", error: { code: "ORG_SCOPE_REQUIRED", message: "This resource cannot be scoped to your organization and is not available to your role." } },
      { status: 403 },
    );
  }

  // MFA/AAL enforcement (ADMIN_PORTAL_REVIEW.md finding #2): every admin
  // mutation requires a verified TOTP factor, unconditionally, unless this
  // account predates the enforcement cutoff (soft launch — see adminMfa.ts).
  const mfaCheck = await requireAdminMfaForMutation(admin, auth);
  if (!mfaCheck.ok) return mfaCheck.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "INVALID_BODY", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  // Whitelist: drop anything not in the registry's mutation columns.
  const patch: Record<string, unknown> = {};
  for (const key of def.mutations.columns) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        status: "error",
        error: { code: "NO_ALLOWED_FIELDS", message: `No updatable fields supplied. Allowed: ${def.mutations.columns.join(", ")}` },
      },
      { status: 400 },
    );
  }

  // Stamp actor fields the resource tracks (reviewer/resolver), so audit
  // data is complete without trusting client-supplied identities.
  if ("status" in patch && auth.email) {
    for (const actorField of ["reviewed_by", "resolved_by", "approved_by", "decided_by", "investigated_by"]) {
      if (def.mutations.columns.includes(actorField) && !(actorField in patch)) {
        patch[actorField] = auth.email;
      }
    }
  }

  const table = tableFor(admin, def.table);
  const scoped = requiresOrgScoping(auth.roleName) && def.orgScopeColumn;

  let beforeQuery = table.select(def.select ?? "*").eq("id", params.id);
  if (scoped) beforeQuery = beforeQuery.eq(def.orgScopeColumn as string, auth.orgId);
  const { data: before, error: fetchErr } = await beforeQuery.maybeSingle();
  // Same tenant-boundary rule as GET: a row owned by another org must
  // 404 for a scoped caller, not surface as a different kind of error.
  if (fetchErr || !before) {
    return NextResponse.json(
      { status: "error", error: { code: "NOT_FOUND", message: `Record ${params.id} not found in ${params.resource}.` } },
      { status: 404 },
    );
  }

  // Segregation-of-duties: this generic admin mutation path shares the
  // resource registry with the compliance data plane (src/lib/admin/
  // resourceApi.ts), which enforces the same declarative guard — a
  // resource with `mutations.selfApprovalGuard` (currently pam-requests)
  // must not let an admin approve a request they themselves made, even
  // though ADMIN_ROLES is a broader role set than compliance's.
  const guard = def.mutations.selfApprovalGuard;
  if (guard && typeof patch.status === "string" && guard.approvalStatuses.includes(patch.status)) {
    const requester = String((before as Record<string, unknown>)[guard.requesterColumn] ?? "").toLowerCase();
    const approver = (auth.email ?? "").toLowerCase();
    if (requester && approver && requester === approver) {
      return NextResponse.json(
        {
          status: "error",
          error: {
            code: "SELF_APPROVAL_BLOCKED",
            message: "You requested this — a different reviewer must approve it (segregation of duties).",
          },
        },
        { status: 409 },
      );
    }
  }

  let updateQuery = table.update(patch).eq("id", params.id);
  if (scoped) updateQuery = updateQuery.eq(def.orgScopeColumn as string, auth.orgId);
  const { data: updated, error: updateErr } = await updateQuery
    // Must use the SAME projection as GET/before-fetch (def.select ?? "*"),
    // not the bare .select() this previously called. A bare .select()
    // returns every column of the updated row regardless of the
    // resource's declared allowlist — for resources like
    // customer-identifiers (excludes id_number_encrypted),
    // webhook-endpoints (excludes signing_secret_hash/masked), and
    // api-credentials (excludes the API secret hash) this silently
    // defeated the very projection those allowlists exist to enforce,
    // leaking the secret back to the client on every successful PATCH.
    .select(def.select ?? "*")
    .single();
  if (updateErr || !updated) {
    return NextResponse.json(
      { status: "error", error: { code: "MUTATION_FAILED", message: updateErr?.message ?? "Update failed." } },
      { status: 400 },
    );
  }

  // Audit trail — the mutation is real and traceable. audit_events carries
  // NOT NULL ip_address/request_id/correlation_id columns (see the same
  // fix already applied to /api/compliance/actions/[action]); this insert
  // was previously missing them, so it violated the NOT NULL constraint
  // and failed silently on every single admin PATCH — no admin mutation
  // was ever actually being recorded to the audit trail despite the
  // response looking successful. Fixed to match the working pattern.
  const requestId =
    request.headers.get("x-kp-request-id") ??
    request.headers.get("x-request-id") ??
    `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { error: auditError } = await admin.from("audit_events").insert({
    org_id: auth.orgId ?? null,
    actor_id: auth.userId ?? "00000000-0000-0000-0000-000000000000",
    actor_email: auth.email ?? "unknown",
    actor_role: auth.roleName ?? "UNKNOWN",
    action: "ADMIN_RESOURCE_UPDATE",
    resource_type: `admin:${params.resource}`,
    resource_id: params.id,
    details: { fields: Object.keys(patch) },
    before_state: before,
    after_state: updated,
    ip_address: request.headers.get("x-forwarded-for") ?? "unrecorded",
    request_id: requestId,
    correlation_id: requestId,
  });
  if (auditError) {
    // The mutation itself already succeeded; surface the audit failure
    // honestly rather than hiding it, since traceability is the whole
    // point of this endpoint existing.
    console.error(`[admin audit] failed to record mutation of ${params.resource}/${params.id}:`, auditError.message);
  }

  return NextResponse.json({ status: "ok", resource: params.resource, record: updated });
}
