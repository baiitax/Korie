import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESOURCES, sanitizeSearchTerm, ResourceDef } from "@/lib/admin/resourceRegistry";
import { requiresOrgScoping } from "@/lib/security/orgScope";

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
  | { kind: "invalid-body"; message: string }
  | { kind: "self-approval-blocked"; message: string }
  | { kind: "org-scope-required"; message: string };

/**
 * Caller identity relevant to tenant scoping (ADMIN_PORTAL_REVIEW.md
 * finding #1). ORGANIZATION_OWNER/ORGANIZATION_ADMIN callers are confined
 * to their own org_id on every resource that declares an orgScopeColumn;
 * resources with no orgScopeColumn are refused outright for those roles
 * rather than served unscoped. SUPER_ADMIN and KoriePay-internal operating
 * roles (COMPLIANCE_OFFICER, AGENCY_OPS_ADMIN, FINANCE_OFFICER,
 * AGENCY_COMPLIANCE) are unaffected — see orgScope.ts.
 */
export interface ResourceScope {
  orgId?: string;
  roleName?: string;
}

function applyOrgScope<T extends { eq: (col: string, val: unknown) => T }>(
  query: T,
  def: ResourceDef,
  scope?: ResourceScope,
): { query: T } | { error: ResourceApiError } {
  if (!scope || !requiresOrgScoping(scope.roleName)) return { query };
  if (!def.orgScopeColumn || !scope.orgId) {
    return {
      error: {
        kind: "org-scope-required",
        message: "This resource cannot be scoped to your organization and is not available to your role.",
      },
    };
  }
  return { query: query.eq(def.orgScopeColumn, scope.orgId) };
}

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
  scope?: ResourceScope,
): Promise<{ values: string[] } | { error: ResourceApiError }> {
  const { admin } = getAdmin();
  if (!admin) return { error: { kind: "backend-unconfigured" } };
  const def = resourceDef(resource);
  const filter = def?.filters?.[facetKey];
  if (!def || !filter) return { error: { kind: "query-failed", message: `No filter "${facetKey}" on resource "${resource}".` } };

  let query = tableFor(admin, def.table)
    .select(filter.column)
    .order(def.orderBy, { ascending: def.asc ?? false })
    .limit(2000);
  const scoped = applyOrgScope(query, def, scope);
  if ("error" in scoped) return { error: scoped.error };
  query = scoped.query;

  const { data, error } = await query;
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
  scope?: ResourceScope,
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

    const scoped = applyOrgScope(query, def, scope);
    if ("error" in scoped) return { error: scoped.error };
    query = scoped.query;

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
  scope?: ResourceScope,
): Promise<{ record: Record<string, unknown> } | { error: ResourceApiError }> {
  const { admin } = getAdmin();
  if (!admin) return { error: { kind: "backend-unconfigured" } };
  const def = resourceDef(resource);
  if (!def) return { error: { kind: "unknown-resource" } };

  let query = tableFor(admin, def.table).select(def.select ?? "*").eq("id", id);
  const scoped = applyOrgScope(query, def, scope);
  if ("error" in scoped) return { error: scoped.error };
  query = scoped.query;

  const { data, error } = await query.maybeSingle();
  if (error) return { error: { kind: "query-failed", message: error.message } };
  // A row that exists but belongs to a different tenant must look identical
  // to a row that doesn't exist — otherwise the endpoint becomes an
  // existence oracle for other tenants' record ids.
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

  const scope: ResourceScope = { orgId: actor.orgId, roleName: actor.roleName };
  const scopeCheck = applyOrgScope(tableFor(admin, def.table).select("id").eq("id", id), def, scope);
  if ("error" in scopeCheck) return { error: scopeCheck.error };

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

  let beforeQuery = table.select(def.select ?? "*").eq("id", id);
  const beforeScoped = applyOrgScope(beforeQuery, def, scope);
  if ("error" in beforeScoped) return { error: beforeScoped.error };
  beforeQuery = beforeScoped.query;

  const { data: before, error: fetchErr } = await beforeQuery.maybeSingle();
  // Same tenant-boundary rule as getResource: a row owned by another
  // tenant must 404, not leak a distinguishable error, to a scoped caller.
  if (fetchErr || !before) return { error: { kind: "not-found" } };

  // Segregation-of-duties: block the maker from also being the checker.
  // Declared per-resource (resourceRegistry.ts) rather than assumed, since
  // most resources here are plain case-management records with no
  // requester/approver split — only ones that model a real maker-checker
  // workflow (e.g. pam-requests) carry this guard.
  const guard = def.mutations.selfApprovalGuard;
  if (guard && typeof patch.status === "string" && guard.approvalStatuses.includes(patch.status)) {
    const requester = String((before as Record<string, unknown>)[guard.requesterColumn] ?? "").toLowerCase();
    const approver = (actor.email ?? "").toLowerCase();
    if (requester && approver && requester === approver) {
      return {
        error: {
          kind: "self-approval-blocked",
          message: "You requested this — a different reviewer must approve it (segregation of duties).",
        },
      };
    }
  }

  let updateQuery = table.update(patch).eq("id", id);
  const updateScoped = applyOrgScope(updateQuery, def, scope);
  if ("error" in updateScoped) return { error: updateScoped.error };
  updateQuery = updateScoped.query;

  const { data: updated, error: updateErr } = await updateQuery.select().single();
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
  "customer-identifiers",
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
