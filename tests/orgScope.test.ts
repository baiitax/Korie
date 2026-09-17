import { describe, it, expect, vi, beforeEach } from "vitest";
import { requiresOrgScoping, TENANT_SCOPED_ROLES } from "@/lib/security/orgScope";
import { RESOURCES } from "@/lib/admin/resourceRegistry";

/**
 * Regression guard for ADMIN_PORTAL_REVIEW.md finding #1 (cross-tenant
 * IDOR): ORGANIZATION_OWNER/ORGANIZATION_ADMIN callers must never see or
 * mutate another tenant's rows through the shared resource registry, and
 * SUPER_ADMIN / KoriePay-internal operating roles must stay unscoped.
 */

describe("requiresOrgScoping", () => {
  it("scopes only ORGANIZATION_OWNER and ORGANIZATION_ADMIN", () => {
    expect(requiresOrgScoping("ORGANIZATION_OWNER")).toBe(true);
    expect(requiresOrgScoping("ORGANIZATION_ADMIN")).toBe(true);
  });

  it("never scopes SUPER_ADMIN or KoriePay-internal operating roles", () => {
    for (const role of ["SUPER_ADMIN", "AGENCY_OPS_ADMIN", "FINANCE_OFFICER", "COMPLIANCE_OFFICER", "AGENCY_COMPLIANCE"]) {
      expect(requiresOrgScoping(role)).toBe(false);
    }
  });

  it("handles missing/unknown roles safely (fail closed elsewhere, not a scoping bypass)", () => {
    expect(requiresOrgScoping(undefined)).toBe(false);
    expect(requiresOrgScoping(null)).toBe(false);
    expect(requiresOrgScoping("SOME_UNKNOWN_ROLE")).toBe(false);
  });

  it("TENANT_SCOPED_ROLES matches the two tenant-owner roles exactly", () => {
    expect([...TENANT_SCOPED_ROLES].sort()).toEqual(["ORGANIZATION_ADMIN", "ORGANIZATION_OWNER"]);
  });
});

describe("resource registry org scope coverage", () => {
  it("declares orgScopeColumn only for tables verified to carry a direct org_id column", () => {
    // Verified against live schema (information_schema.columns) — see
    // session investigation notes. Any resource added to this list without
    // a real org_id column would silently deny tenant-role callers instead
    // of leaking cross-tenant data, but keeping this list accurate matters
    // for tenant roles to actually be able to use the portal.
    const expectedScoped = [
      "customers",
      "wallets",
      "agents",
      "agent-applications",
      "aggregators",
      "webhook-endpoints",
      "outbox-events",
      "ledger-accounts",
      "ledger-transactions",
      "settlement-batches",
      "audit-events",
      "support-officers",
    ];
    for (const name of expectedScoped) {
      expect(RESOURCES[name], `missing resource: ${name}`).toBeTruthy();
      expect(RESOURCES[name].orgScopeColumn, `${name}.orgScopeColumn`).toBe("org_id");
    }
  });

  it("does not declare orgScopeColumn for resources known to have no direct tenant column", () => {
    // These either link to a tenant transitively (customer_id/agent_id) or
    // are genuinely platform-global reference/ops data with no org concept.
    // A tenant-scoped caller must be refused these resources, not served
    // them unscoped — see orgScope.ts.
    const expectedUnscoped = [
      "fx-rates",
      "roles",
      "organizations",
      "risk-cases",
      "security-incidents",
      "treasury-deals",
      "ledger-entries",
      "payments",
      "customer-transactions",
    ];
    for (const name of expectedUnscoped) {
      expect(RESOURCES[name], `missing resource: ${name}`).toBeTruthy();
      expect(RESOURCES[name].orgScopeColumn).toBeUndefined();
    }
  });
});

/**
 * Query-builder scoping behavior: exercises listResource/getResource/
 * patchResource directly against a fake Supabase-shaped chain so a
 * regression that drops the `.eq(orgScopeColumn, …)` call is caught even
 * though the suite has no live database.
 */
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

function makeChain(rows: Record<string, unknown>[]) {
  const eqCalls: [string, unknown][] = [];
  const chain: any = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return chain;
    }),
    or: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    update: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => {
      const scopedByOrg = eqCalls.find(([c]) => c === "org_id");
      const filtered = scopedByOrg ? rows.filter((r) => r.org_id === scopedByOrg[1]) : rows;
      return { data: filtered[0] ?? null, error: null };
    }),
    single: vi.fn(async () => {
      const scopedByOrg = eqCalls.find(([c]) => c === "org_id");
      const filtered = scopedByOrg ? rows.filter((r) => r.org_id === scopedByOrg[1]) : rows;
      return { data: filtered[0] ?? null, error: null };
    }),
    then: (resolve: any) => {
      const scopedByOrg = eqCalls.find(([c]) => c === "org_id");
      const filtered = scopedByOrg ? rows.filter((r) => r.org_id === scopedByOrg[1]) : rows;
      return Promise.resolve({ data: filtered, error: null, count: filtered.length }).then(resolve);
    },
    __eqCalls: eqCalls,
  };
  return chain;
}

describe("resourceApi org scoping (mocked query builder)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("listResource injects .eq(org_id, callerOrgId) for a scoped role on a scoped resource", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const rowsA = [{ id: "1", org_id: "org-a" }];
    const rowsB = [{ id: "2", org_id: "org-b" }];
    const chain = makeChain([...rowsA, ...rowsB]);
    (getSupabaseAdminClient as any).mockReturnValue({ from: () => chain });

    const { listResource } = await import("@/lib/admin/resourceApi");
    const result = await listResource("customers", new URLSearchParams(), { orgId: "org-a", roleName: "ORGANIZATION_ADMIN" });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.rows).toEqual(rowsA);
    }
    expect(chain.__eqCalls).toContainEqual(["org_id", "org-a"]);
  });

  it("listResource does not scope SUPER_ADMIN callers", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const rows = [{ id: "1", org_id: "org-a" }, { id: "2", org_id: "org-b" }];
    const chain = makeChain(rows);
    (getSupabaseAdminClient as any).mockReturnValue({ from: () => chain });

    const { listResource } = await import("@/lib/admin/resourceApi");
    const result = await listResource("customers", new URLSearchParams(), { orgId: "org-a", roleName: "SUPER_ADMIN" });
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.rows).toHaveLength(2);
    }
  });

  it("listResource refuses a scoped role on a resource with no orgScopeColumn", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const chain = makeChain([{ id: "1" }]);
    (getSupabaseAdminClient as any).mockReturnValue({ from: () => chain });

    const { listResource } = await import("@/lib/admin/resourceApi");
    const result = await listResource("fx-rates", new URLSearchParams(), { orgId: "org-a", roleName: "ORGANIZATION_ADMIN" });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("org-scope-required");
    }
  });

  it("getResource treats another tenant's record as not-found for a scoped role", async () => {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const chain = makeChain([{ id: "1", org_id: "org-b" }]);
    (getSupabaseAdminClient as any).mockReturnValue({ from: () => chain });

    const { getResource } = await import("@/lib/admin/resourceApi");
    const result = await getResource("customers", "1", { orgId: "org-a", roleName: "ORGANIZATION_OWNER" });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("not-found");
    }
  });
});
