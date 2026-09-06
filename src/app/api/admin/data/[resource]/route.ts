import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest, ADMIN_READ_ROLES } from "@/lib/security/adminAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESOURCES, sanitizeSearchTerm, ResourceDef } from "@/lib/admin/resourceRegistry";

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
    const { data, error: facetErr } = await tableFor(admin, def)
      .select(filter.column)
      .order(def.orderBy, { ascending: def.asc ?? false })
      .limit(2000);
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
