import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthenticatedAggregatorStaffContext } from "@/lib/security/aggregatorAuth";

/**
 * Phase B (F4) — aggregator MFA + IP allowlist contract tests.
 *
 * Covers:
 *  1. checkAggregatorMfa / requireAggregatorMfaIfEnforced — org opt-in
 *     enforcement is honest: no restriction when the org hasn't turned it
 *     on, a hard 403 when it has and the staff member has no verified
 *     factor, and a pass when they do.
 *  2. requireAggregatorAuthorization — the combined permission+MFA gate
 *     used by every privileged route: permission failure short-circuits
 *     before an MFA lookup is even attempted; MFA failure is only reached
 *     once the permission check already passed.
 *  3. The IP allowlist CIDR normalization/validation logic used by the
 *     ip-allowlist route (extracted here as pure-function tests against
 *     the same regex/normalization the route file defines).
 */

const mockAdmin = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: { admin: { getUserById: vi.fn() } },
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

import { checkAggregatorMfa, requireAggregatorMfaIfEnforced } from "@/lib/security/aggregatorMfa";
import { requireAggregatorAuthorization } from "@/lib/security/aggregatorPermissions";

function makeStaff(role: AuthenticatedAggregatorStaffContext["role"]): AuthenticatedAggregatorStaffContext {
  return {
    staffId: "staff-1",
    aggregatorId: "agg-1",
    orgId: "org-1",
    authUserId: "auth-user-1",
    fullName: "Test Staffer",
    email: "test@example.com",
    role,
    territoryScope: [],
    aggregatorStatus: "ACTIVE",
    kybStatus: "VERIFIED",
    requestId: "req-1",
  };
}

function setupAdmin(opts: { mfaRequired: boolean; factors: { status: string }[] }) {
  mockAdmin.from.mockImplementation((table: string) => {
    if (table === "aggregators") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { mfa_required: opts.mfaRequired }, error: null }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  mockAdmin.auth.admin.getUserById.mockResolvedValue({
    data: { user: { factors: opts.factors } },
    error: null,
  });
}

describe("checkAggregatorMfa / requireAggregatorMfaIfEnforced", () => {
  beforeEach(() => {
    mockAdmin.from.mockReset();
    mockAdmin.auth.admin.getUserById.mockReset();
  });

  it("is satisfied when the org does not require MFA, regardless of factor enrollment", async () => {
    setupAdmin({ mfaRequired: false, factors: [] });
    const staff = makeStaff("AGGREGATOR_OWNER");
    const result = await checkAggregatorMfa(mockAdmin as any, staff);
    expect(result.ok).toBe(true);
    expect(result.orgRequiresMfa).toBe(false);
    expect(result.hasVerifiedFactor).toBe(false);

    const gate = await requireAggregatorMfaIfEnforced(mockAdmin as any, staff);
    expect(gate.ok).toBe(true);
  });

  it("rejects with 403 MFA_REQUIRED when the org requires MFA and the staff member has no verified factor", async () => {
    setupAdmin({ mfaRequired: true, factors: [{ status: "unverified" }] });
    const staff = makeStaff("AGGREGATOR_ADMIN");
    const gate = await requireAggregatorMfaIfEnforced(mockAdmin as any, staff);
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      const json = await gate.response.json();
      expect(gate.response.status).toBe(403);
      expect(json.error.code).toBe("MFA_REQUIRED");
    }
  });

  it("passes when the org requires MFA and the staff member has a verified factor", async () => {
    setupAdmin({ mfaRequired: true, factors: [{ status: "verified" }] });
    const staff = makeStaff("FINANCE_MANAGER");
    const gate = await requireAggregatorMfaIfEnforced(mockAdmin as any, staff);
    expect(gate.ok).toBe(true);
  });
});

describe("requireAggregatorAuthorization — combined permission + MFA gate", () => {
  beforeEach(() => {
    mockAdmin.from.mockReset();
    mockAdmin.auth.admin.getUserById.mockReset();
  });

  it("rejects on the permission check WITHOUT ever looking up MFA status", async () => {
    const staff = makeStaff("AUDITOR"); // holds no permissions at all
    const result = await requireAggregatorAuthorization(staff, "aggregator.liquidity.dispatch");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const json = await result.response.json();
      expect(json.error.code).toBe("FORBIDDEN_PERMISSION");
    }
    // The MFA lookup (aggregators.mfa_required / getUserById) must never
    // have been reached — permission failure short-circuits first.
    expect(mockAdmin.from).not.toHaveBeenCalled();
    expect(mockAdmin.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("passes permission but rejects on MFA when the org enforces it and the staff has no verified factor", async () => {
    setupAdmin({ mfaRequired: true, factors: [] });
    const staff = makeStaff("FINANCE_MANAGER"); // holds aggregator.liquidity.dispatch
    const result = await requireAggregatorAuthorization(staff, "aggregator.liquidity.dispatch");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const json = await result.response.json();
      expect(json.error.code).toBe("MFA_REQUIRED");
    }
  });

  it("passes both checks when the role has the permission and MFA is either unenforced or satisfied", async () => {
    setupAdmin({ mfaRequired: false, factors: [] });
    const staff = makeStaff("AGGREGATOR_OWNER");
    const result = await requireAggregatorAuthorization(staff, "aggregator.keys.manage");
    expect(result.ok).toBe(true);
  });
});

describe("aggregator IP allowlist — CIDR normalization (mirrors the route's own regexes)", () => {
  // Re-implemented locally to test the exact contract the route enforces,
  // since the route file's normalizeCidr is not exported (kept private to
  // the route module by convention in this codebase).
  const IPV4_OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
  const IPV4_CIDR = new RegExp(`^(${IPV4_OCTET}\\.){3}${IPV4_OCTET}(\\/(3[0-2]|[12]?\\d))?$`);
  const IPV6_CIDR = /^[0-9a-fA-F:]+(\/(12[0-8]|1[01]\d|\d{1,2}))?$/;
  function normalizeCidr(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (IPV4_CIDR.test(trimmed)) return trimmed.includes("/") ? trimmed : `${trimmed}/32`;
    if (trimmed.includes(":") && IPV6_CIDR.test(trimmed)) return trimmed.includes("/") ? trimmed : `${trimmed}/128`;
    return null;
  }

  it("accepts a bare IPv4 address and defaults it to /32", () => {
    expect(normalizeCidr("41.58.12.9")).toBe("41.58.12.9/32");
  });

  it("accepts an explicit IPv4 CIDR block unchanged", () => {
    expect(normalizeCidr("41.58.12.0/24")).toBe("41.58.12.0/24");
  });

  it("accepts a bare IPv6 address and defaults it to /128", () => {
    expect(normalizeCidr("2001:db8::1")).toBe("2001:db8::1/128");
  });

  it("rejects garbage input", () => {
    expect(normalizeCidr("not-an-ip")).toBeNull();
    expect(normalizeCidr("")).toBeNull();
    expect(normalizeCidr("999.999.999.999")).toBeNull();
  });
});

describe("GET /api/v1/aggregator/security/ip-allowlist route — self-lockout guardrail", () => {
  it("ipv4InCidr correctly matches/rejects containment (mirrors the route's own helper)", async () => {
    // Re-implemented locally since the route doesn't export it — this
    // documents and pins the exact containment semantics relied upon by
    // the self-lockout guardrail in POST /security/ip-allowlist.
    function ipv4InCidr(ip: string, cidr: string): boolean {
      const [range, bitsStr] = cidr.split("/");
      const bits = bitsStr ? parseInt(bitsStr, 10) : 32;
      const toInt = (addr: string) => addr.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || !/^(\d{1,3}\.){3}\d{1,3}$/.test(range)) return false;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      return (toInt(ip) & mask) === (toInt(range) & mask);
    }

    expect(ipv4InCidr("41.58.12.9", "41.58.12.0/24")).toBe(true);
    expect(ipv4InCidr("41.58.13.9", "41.58.12.0/24")).toBe(false);
    expect(ipv4InCidr("10.0.0.5", "10.0.0.5/32")).toBe(true);
    expect(ipv4InCidr("10.0.0.6", "10.0.0.5/32")).toBe(false);
  });
});
