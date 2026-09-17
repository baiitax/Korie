import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * ADMIN_PORTAL_REVIEW.md finding #4 — bulk CSV export must leave an
 * audit_events trail. This tests the server side of the fix:
 * POST /api/admin/data/[resource] records an ADMIN_CSV_EXPORT audit_events
 * row before the client is allowed to proceed with (its already
 * client-side) download.
 */

const mockAdmin: any = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

import { POST } from "@/app/api/admin/data/[resource]/route";

function makeRequest(resource: string, body: unknown, token = "valid-token") {
  const url = new URL(`http://localhost/api/admin/data/${resource}`);
  return new NextRequest(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Wires the auth chain (auth.getUser -> user_profiles -> organization_members) to succeed as a given role. */
function setupAuthorizedAdmin(opts: { roleName?: string; orgId?: string } = {}) {
  mockAdmin.auth.getUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } }, error: null });

  const insertedRows: Record<string, unknown>[] = [];

  mockAdmin.from.mockImplementation((table: string) => {
    if (table === "user_profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "profile-1", created_at: "2020-01-01T00:00:00.000Z" }, error: null }),
          }),
        }),
      };
    }
    if (table === "organization_members") {
      return {
        select: () => ({
          eq: () => ({
            eq: async () => ({
              data: [{ org_id: opts.orgId ?? "org-1", status: "ACTIVE", roles: { name: opts.roleName ?? "SUPER_ADMIN" } }],
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "audit_events") {
      return {
        insert: async (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { data: null, error: null };
        },
      };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });

  return insertedRows;
}

describe("POST /api/admin/data/[resource] (CSV export audit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated request without writing anything", async () => {
    mockAdmin.auth.getUser.mockResolvedValue({ data: null, error: new Error("invalid") });
    const res = await POST(makeRequest("customers", { rowCount: 5 }), { params: { resource: "customers" } });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown resource", async () => {
    setupAuthorizedAdmin();
    const res = await POST(makeRequest("not-a-real-resource", { rowCount: 1 }), { params: { resource: "not-a-real-resource" } });
    expect(res.status).toBe(404);
  });

  it("records an ADMIN_CSV_EXPORT audit_events row with actor, resource, row count, columns and filters", async () => {
    const inserted = setupAuthorizedAdmin({ roleName: "SUPER_ADMIN", orgId: "org-1" });
    const res = await POST(
      makeRequest("customers", {
        rowCount: 42,
        columns: ["id", "full_name", "kyc_tier"],
        filters: { status: "ACTIVE" },
        q: "jane",
      }),
      { params: { resource: "customers" } },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.audited).toBe(true);

    expect(inserted).toHaveLength(1);
    const row = inserted[0];
    expect(row.action).toBe("ADMIN_CSV_EXPORT");
    expect(row.resource_type).toBe("admin:customers");
    expect((row.details as any).row_count).toBe(42);
    expect((row.details as any).columns).toEqual(["id", "full_name", "kyc_tier"]);
    expect((row.details as any).filters).toEqual({ status: "ACTIVE" });
    expect((row.details as any).search).toBe("jane");
    expect(row.actor_role).toBe("SUPER_ADMIN");
  });

  it("still records an export attempt even with no body sent (best-effort context)", async () => {
    const inserted = setupAuthorizedAdmin();
    const url = new URL("http://localhost/api/admin/data/agents");
    const req = new NextRequest(url, { method: "POST", headers: { authorization: "Bearer t" } });
    const res = await POST(req, { params: { resource: "agents" } });
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(1);
    expect((inserted[0].details as any).row_count).toBeNull();
  });

  it("surfaces a failed audit write honestly as an error rather than pretending success", async () => {
    mockAdmin.auth.getUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } }, error: null });
    mockAdmin.from.mockImplementation((table: string) => {
      if (table === "user_profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "profile-1", created_at: "2020-01-01T00:00:00.000Z" }, error: null }) }) }) };
      }
      if (table === "organization_members") {
        return {
          select: () => ({
            eq: () => ({ eq: async () => ({ data: [{ org_id: "org-1", status: "ACTIVE", roles: { name: "SUPER_ADMIN" } }], error: null }) }),
          }),
        };
      }
      if (table === "audit_events") {
        return { insert: async () => ({ data: null, error: new Error("insert failed") }) };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const res = await POST(makeRequest("customers", { rowCount: 1 }), { params: { resource: "customers" } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("EXPORT_AUDIT_FAILED");
  });
});
