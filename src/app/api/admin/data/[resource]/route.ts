import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESOURCES, sanitizeSearchTerm, ResourceDef } from "@/lib/admin/resourceRegistry";
import { requiresOrgScoping } from "@/lib/security/orgScope";
import { enforceAdminRateLimit } from "@/lib/security/adminRateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/data/[resource] — the read path for every admin module
 * page. Reads the real database through the resource registry (whitelisted
 * columns/filters only). No in-memory engine data, no fabricated rows.
 *
 * Query params:
 *   q      — ilike search over the resource's declared search columns
 *   limit  — page size (default 100, max 200)
 *   offset — pagination offset
 *   any whitelisted filter key from the registry (eq/gte/lte)
 */

function tableFor(admin: any, def: ResourceDef) {
  const { table } = def;
  if (table.includes(".")) {
    const [schema, name] = table.split(".");
    return admin.schema(schema).from(name);
  }
  return admin.from(table);
}

/**
 * POST /api/admin/data/[resource] — records an audit_events row for a
 * bulk CSV export (ADMIN_PORTAL_REVIEW.md finding #4). The export itself
 * happens entirely client-side in ResourceTable.tsx (it only has the rows
 * already loaded in the browser — there is no server round-trip for the
 * CSV content), so this is the one server call in that flow: it exists
 * purely so "who exported which rows, from where, and when" has the same
 * kind of trail every mutation in this portal already has. Read-only
 * roles may call this (matches who can trigger an export at all).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { resource: string } },
) {
  const auth = await authorizeAdminRequest(request, ADMIN_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }

  const rl = enforceAdminRateLimit(auth.userId, "admin", "DEFAULT");
  if (!rl.ok) return rl.response!;

  const def = RESOURCES[params.resource];
  if (!def) {
    return NextResponse.json(
      { status: "error", error: { code: "UNKNOWN_RESOURCE", message: `Resource "${params.resource}" is not registered.` } },
      { status: 404 },
    );
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { status: "error", error: { code: "ADMIN_BACKEND_NOT_CONFIGURED", message: "The admin backend is not configured on this deployment (missing Supabase credentials)." } },
      { status: 503 },
    );
  }

  let body: { rowCount?: number; columns?: string[]; filters?: Record<string, string>; q?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional context only — an export is still worth recording
    // even if the client failed to send row/filter details.
  }

  const rowCount = typeof body.rowCount === "number" && Number.isFinite(body.rowCount) ? Math.max(0, Math.trunc(body.rowCount)) : null;
  const requestId =
    request.headers.get("x-kp-request-id") ??
    request.headers.get("x-request-id") ??
    `admin-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const { error: auditError } = await admin.from("audit_events").insert({
    org_id: auth.orgId ?? null,
    actor_id: auth.userId ?? "00000000-0000-0000-0000-000000000000",
    actor_email: auth.email ?? "unknown",
    actor_role: auth.roleName ?? "UNKNOWN",
    action: "ADMIN_CSV_EXPORT",
    resource_type: `admin:${params.resource}`,
    resource_id: "bulk",
    details: {
      row_count: rowCount,
      columns: Array.isArray(body.columns) ? body.columns.slice(0, 50) : undefined,
      filters: body.filters && typeof body.filters === "object" ? body.filters : undefined,
      search: typeof body.q === "string" && body.q ? body.q : undefined,
    },
    before_state: null,
    after_state: null,
    ip_address: request.headers.get("x-forwarded-for") ?? "unrecorded",
    request_id: requestId,
    correlation_id: requestId,
  });

  if (auditError) {
    // Surface honestly rather than silently swallowing — but a failed
    // audit write does not itself move or destroy data, so the client is
    // free to proceed with the (already browser-side) download regardless.
    // What matters is this endpoint always attempted the write and never
    // pretends success it didn't achieve.
    return NextResponse.json(
      { status: "error", error: { code: "EXPORT_AUDIT_FAILED", message: auditError.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: "ok", resource: params.resource, audited: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { resource: string } },
) {
  const auth = await authorizeAdminRequest(request, ADMIN_READ_ROLES);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { status: "error", error: { code: auth.errorCode, message: auth.errorMessage } },
      { status: auth.httpStatus ?? 401 },
    );
  }

  // Rate limiting (ADMIN_PORTAL_REVIEW.md finding #5): keyed per actor, not
  // IP — an authenticated session (or a leaked token) could otherwise page
  // through every resource in the registry unthrottled. See adminRateLimit.ts.
  const rl = enforceAdminRateLimit(auth.userId, "admin", "READ");
  if (!rl.ok) return rl.response!;

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: {
          code: "ADMIN_BACKEND_NOT_CONFIGURED",
          message: "The admin backend is not configured on this deployment (missing Supabase credentials).",
        },
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

  // Tenant scoping (ADMIN_PORTAL_REVIEW.md finding #1): ORGANIZATION_OWNER/
  // ORGANIZATION_ADMIN callers only ever see their own org's rows. A
  // resource with no orgScopeColumn has no direct tenant column in the
  // database at all, so it's refused for those roles rather than served
  // unscoped — see src/lib/security/orgScope.ts.
  if (requiresOrgScoping(auth.roleName)) {
    if (!def.orgScopeColumn || !auth.orgId) {
      return NextResponse.json(
        {
          status: "error",
          error: {
            code: "ORG_SCOPE_REQUIRED",
            message: "This resource cannot be scoped to your organization and is not available to your role.",
          },
        },
        { status: 403 },
      );
    }
  }
  const orgScope = requiresOrgScoping(auth.roleName) && def.orgScopeColumn ? { column: def.orgScopeColumn, value: auth.orgId as string } : null;

  const sp = request.nextUrl.searchParams;

  // ?facet=<filterKey> — distinct values for a whitelisted filter column,
  // derived from the database itself (recent records) so dropdowns never
  // ship guessed enum lists.
  const facet = sp.get("facet");
  if (facet) {
    const filter = def.filters?.[facet];
    if (!filter) {
      return NextResponse.json(
        { status: "error", error: { code: "UNKNOWN_FACET", message: `No filter "${facet}" on resource "${params.resource}".` } },
        { status: 400 },
      );
    }
    let facetQuery = tableFor(admin, def)
      .select(filter.column)
      .order(def.orderBy, { ascending: def.asc ?? false })
      .limit(2000);
    if (orgScope) facetQuery = facetQuery.eq(orgScope.column, orgScope.value);
    const { data, error: facetErr } = await facetQuery;
    if (facetErr) {
      return NextResponse.json(
        { status: "error", error: { code: "RESOURCE_QUERY_FAILED", message: facetErr.message } },
        { status: 400 },
      );
    }
    const distinct = Array.from(
      new Set(
        (data ?? []).map((r: Record<string, unknown>) => r[filter.column]).filter((v: unknown): v is string => v !== null && v !== undefined),
      ),
    ).slice(0, 100);
    return NextResponse.json({ status: "ok", resource: params.resource, facet: facet, values: distinct });
  }

  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "100", 10) || 100, 1), 200);
  const offset = Math.max(parseInt(sp.get("offset") ?? "0", 10) || 0, 0);

  try {
    let query = tableFor(admin, def)
      .select(def.select ?? "*", { count: "exact" })
      .order(def.orderBy, { ascending: def.asc ?? false })
      .range(offset, offset + limit - 1);

    if (orgScope) query = query.eq(orgScope.column, orgScope.value);

    // Whitelisted filters only — never raw user input into the query.
    for (const [key, filter] of Object.entries(def.filters ?? {})) {
      const raw = sp.get(key);
      if (raw === null || raw === "") continue;
      let value: unknown = raw;
      if (filter.boolean) value = raw === "true";
      if (filter.op === "eq") query = query.eq(filter.column, value);
      else if (filter.op === "in") query = query.in(filter.column, raw.split(","));
      else if (filter.op === "gte") query = query.gte(filter.column, value);
      else if (filter.op === "lte") query = query.lte(filter.column, value);
    }

    const q = sanitizeSearchTerm(sp.get("q") ?? "");
    if (q && def.search?.length) {
      query = query.or(def.search.map((c) => `${c}.ilike.%${q}%`).join(","));
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json(
        { status: "error", error: { code: "RESOURCE_QUERY_FAILED", message: error.message } },
        { status: 400 },
      );
    }

    return NextResponse.json({
      status: "ok",
      resource: params.resource,
      rows: data ?? [],
      count: count ?? 0,
      limit,
      offset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected database error";
    return NextResponse.json(
      { status: "error", error: { code: "RESOURCE_QUERY_FAILED", message } },
      { status: 500 },
    );
  }
}
