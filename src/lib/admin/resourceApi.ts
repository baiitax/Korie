import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESOURCES, sanitizeSearchTerm, ResourceDef } from "@/lib/admin/resourceRegistry";

/**
 * Shared resource query engine — the single implementation behind both the
 * admin data plane (/api/admin/data/*) and the compliance data plane
 * (/api/compliance/data/*). Auth happens in the routes; this module only
 * talks to the database through the registry's whitelists.
 */

export interface ResourceActor {
  userId?: string;
  /** user_profiles.id — audit_events.actor_id. */
  profileId?: string;
  orgId?: string;
  roleName?: string;
  email?: string;
  /** Request context captured by the route, stamped into the audit row. */
  ip?: string;
  requestId?: string;
}

export type ResourceApiError =
  | { kind: "backend-unconfigured" }
  | { kind: "unknown-resource" }
  | { kind: "not-found" }
  | { kind: "query-failed"; message: string }
  | { kind: "mutation-not-allowed" }
  | { kind: "invalid-body"; message: string };

function getAdmin() {
  try {
    return { admin: getSupabaseAdminClient() };
  } catch {
    return { admin: null };
  }
}

export function tableFor(admin: any, table: string) {
  if (table.includes(".")) {
    const [schema, name] = table.split(".");
    return admin.schema(schema).from(name);
  }
  return admin.from(table);
}

function resourceDef(resource: string): ResourceDef | null {
  return RESOURCES[resource] ?? null;
}

/** Distinct values of a whitelisted filter column (facet dropdowns). */
export async function facetResource(
  resource: string,
  facetKey: string,
): Promise<{ values: string[] } | { error: ResourceApiError }> {
  const { admin } = getAdmin();
  if (!admin) return { error: { kind: "backend-unconfigured" } };
  const def = resourceDef(resource);
  const filter = def?.filters?.[facetKey];
  if (!def || !filter) return { error: { kind: "query-failed", message: `No filter "${facetKey}" on resource "${resource}".` } };

  const { data, error } = await tableFor(admin, def.table)
    .select(filter.column)
    .order(def.orderBy, { ascending: def.asc ?? false })
    .limit(2000);
  if (error) return { error: { kind: "query-failed", message: error.message } };
  const distinct = Array.from(
    new Set<string>(
      (data ?? []).map((r: Record<string, unknown>) => String(r[filter.column] ?? "")).filter((v: string) => v !== "" && v !== "null" && v !== "undefined"),
    ),
  ).slice(0, 100);
  return { values: distinct };
}

/** List with whitelisted filters, ilike search, exact count and pagination. */
export async function listResource(
  resource: string,
  sp: URLSearchParams,
): Promise<{ rows: unknown[]; count: number; limit: number; offset: number } | { error: ResourceApiError }> {
  const { admin } = getAdmin();
  if (!admin) return { error: { kind: "backend-unconfigured" } };
  const def = resourceDef(resource);
  if (!def) return { error: { kind: "unknown-resource" } };

  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "100", 10) || 100, 1), 200);
  const offset = Math.max(parseInt(sp.get("offset") ?? "0", 10) || 0, 0);

  try {
    let query = tableFor(admin, def.table)
      .select(def.select ?? "*", { count: "exact" })
      .order(def.orderBy, { ascending: def.asc ?? false })
      .range(offset, offset + limit - 1);

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
    if (error) return { error: { kind: "query-failed", message: error.message } };
    return { rows: data ?? [], count: count ?? 0, limit, offset };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected database error";
    return { error: { kind: "query-failed", message } };
  }
}

export async function getResource(
  resource: string,
  id: string,
): Promise<{ record: Record<string, unknown> } | { error: ResourceApiError }> {
  const { admin } = getAdmin();
  if (!admin) return { error: { kind: "backend-unconfigured" } };
  const def = resourceDef(resource);
  if (!def) return { error: { kind: "unknown-resource" } };

  const { data, error } = await tableFor(admin, def.table)
    .select(def.select ?? "*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: { kind: "query-failed", message: error.message } };
  if (!data) return { error: { kind: "not-found" } };
  return { record: data as Record<string, unknown> };
}

/**
 * Audited mutation: whitelisted columns only, actor fields stamped from the
 * verified identity, and an audit_events row with before/after state.
 */
export async function patchResource(
  resource: string,
  id: string,
  body: Record<string, unknown>,
  actor: ResourceActor,
): Promise<{ record: Record<string, unknown> } | { error: ResourceApiError }> {
  const { admin } = getAdmin();
  if (!admin) return { error: { kind: "backend-unconfigured" } };
  const def = resourceDef(resource);
  if (!def) return { error: { kind: "unknown-resource" } };
  if (!def.mutations) return { error: { kind: "mutation-not-allowed" } };

  const patch: Record<string, unknown> = {};
  for (const key of def.mutations.columns) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return {
      error: { kind: "invalid-body", message: `No updatable fields supplied. Allowed: ${def.mutations.columns.join(", ")}` },
    };
  }

  // "Lift restriction" closes a restriction out: who lifted it and when come
  // from the verified session and the server clock. lifted_by is in the
  // client whitelist only so the column is writable at all — identity is
  // never trusted from the request body.
  if (patch.is_active === false && def.mutations.columns.includes("lifted_by")) {
    patch.lifted_by = actor.email ?? "unknown";
    patch.lifted_at = new Date().toISOString();
  }

  // Stamp actor fields the resource tracks — never trust client identity.
  if ("status" in patch && actor.email) {
    for (const actorField of ["reviewed_by", "resolved_by", "approved_by", "decided_by", "investigated_by", "decision_maker", "checker_email"]) {
      if (def.mutations.columns.includes(actorField) && !(actorField in patch)) {
        patch[actorField] = actor.email;
      }
    }
  }
  // Close-out timestamps when a workflow reaches a terminal state.
  if (patch.status === "RESOLVED" || patch.status === "CLOSED") {
    if (def.mutations.columns.includes("resolved_at") && !("resolved_at" in patch)) patch.resolved_at = new Date().toISOString();
    if (def.mutations.columns.includes("closed_at") && !("closed_at" in patch)) patch.closed_at = new Date().toISOString();
    if (def.mutations.columns.includes("decided_at") && !("decided_at" in patch)) patch.decided_at = new Date().toISOString();
  }

  const table = tableFor(admin, def.table);

  const { data: before, error: fetchErr } = await table
    .select(def.select ?? "*")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !before) return { error: { kind: "not-found" } };

  const { data: updated, error: updateErr } = await table.update(patch).eq("id", id).select().single();
  if (updateErr || !updated) return { error: { kind: "query-failed", message: updateErr?.message ?? "Update failed." } };

  // audit_events carries NOT NULL ip/request/correlation columns: a synthetic
  // seed marker would be a fabrication, so unknown values are labelled
  // explicitly rather than left null.
  const auditRequestId = actor.requestId ?? `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await admin.from("audit_events").insert({
    org_id: actor.orgId ?? null,
    actor_id: actor.profileId ?? actor.userId ?? "00000000-0000-0000-0000-000000000000",
    actor_email: actor.email ?? "unknown",
    actor_role: actor.roleName ?? "UNKNOWN",
    action: "COMPLIANCE_RESOURCE_UPDATE",
    resource_type: `compliance:${resource}`,
    resource_id: id,
    details: { fields: Object.keys(patch) },
    before_state: before,
    after_state: updated,
    ip_address: actor.ip ?? "unrecorded",
    request_id: auditRequestId,
    correlation_id: auditRequestId,
  });

  return { record: updated as Record<string, unknown> };
}

/** Whitelist of resources the compliance portal may read. */
export const COMPLIANCE_READABLE_RESOURCES = new Set([
  "aml-alerts",
  "aml-cases",
  "aml-case-notes",
  "aml-scenarios",
  "aml-customer-profiles",
  "risk-cases",
  "risk-rules",
  "risk-decisions",
  "risk-issues",
  "risk-controls",
  "identity-persons",
  "identity-organizations",
  "identity-documents",
  "identity-verifications",
  "customers",
  "customer-accounts",
  "customer-transactions",
  "customer-kyc-documents",
  "customer-disputes",
  "customer-restrictions",
  "aml-customer-profiles",
  "agents",
  "merchant-profiles",
  "complaints",
  "regulatory-reports",
  "regulatory-obligations",
  "regulatory-restatements",
  "provider-nodes",
  "workforce-identities",
  "user-profiles",
  "audit-events",
  "banking-nodes",
  "partners",
  "incidents",
  "security-alerts",
  "security-incidents",
  "pam-requests",
  "iam-sessions",
  "early-warnings",
  "payments",
  "agency-transactions",
  "agents",
  "agent-applications",
  "merchant-profiles",
]);

/** Whitelist of resources compliance officers may mutate. */
export const COMPLIANCE_MUTABLE_RESOURCES = new Set([
  "aml-alerts",
  "aml-cases",
  "customer-kyc-documents",
  "complaints",
  "customer-restrictions",
  "aml-customer-profiles",
  "agents",
  "merchant-profiles",
  "risk-cases",
  "regulatory-reports",
  "regulatory-obligations",
  "pam-requests",
  "security-alerts",
  "security-incidents",
  "early-warnings",
]);
