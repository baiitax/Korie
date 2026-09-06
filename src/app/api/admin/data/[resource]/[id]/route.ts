import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESOURCES } from "@/lib/admin/resourceRegistry";

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

  const { data, error } = await tableFor(admin, def.table)
    .select(def.select ?? "*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { status: "error", error: { code: "RESOURCE_QUERY_FAILED", message: error.message } },
      { status: 400 },
    );
  }
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

  const { data: before, error: fetchErr } = await table
    .select(def.select ?? "*")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchErr || !before) {
    return NextResponse.json(
      { status: "error", error: { code: "NOT_FOUND", message: `Record ${params.id} not found in ${params.resource}.` } },
      { status: 404 },
    );
  }

  const { data: updated, error: updateErr } = await table
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();
  if (updateErr || !updated) {
    return NextResponse.json(
      { status: "error", error: { code: "MUTATION_FAILED", message: updateErr?.message ?? "Update failed." } },
      { status: 400 },
    );
  }

  // Audit trail — the mutation is real and traceable.
  await admin.from("audit_events").insert({
    org_id: auth.orgId ?? null,
    actor_id: auth.userId ?? null,
    actor_email: auth.email ?? null,
    actor_role: auth.roleName ?? null,
    action: "ADMIN_RESOURCE_UPDATE",
    resource_type: `admin:${params.resource}`,
    resource_id: params.id,
    details: { fields: Object.keys(patch) },
    before_state: before,
    after_state: updated,
  });

  return NextResponse.json({ status: "ok", resource: params.resource, record: updated });
}
