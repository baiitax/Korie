import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdminAuthResult } from "@/lib/security/adminAuth";

/**
 * Admin Portal MFA enforcement (ADMIN_PORTAL_REVIEW.md finding #2).
 *
 * Covers checkAdminMfa / requireAdminMfaForMutation: enforcement is
 * unconditional (no per-org opt-out, unlike the aggregator portal) except
 * for a fixed grandfather cutoff so pre-existing accounts aren't locked
 * out of every mutation the moment this ships.
 */

const mockAdmin = {
  auth: { admin: { getUserById: vi.fn() } },
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

import { checkAdminMfa, requireAdminMfaForMutation, ADMIN_MFA_ENFORCEMENT_CUTOFF } from "@/lib/security/adminMfa";

function makeAuth(overrides: Partial<AdminAuthResult> = {}): AdminAuthResult {
  return {
    isAuthorized: true,
    userId: "auth-user-1",
    orgId: "org-1",
    roleName: "SUPER_ADMIN",
    email: "admin@example.com",
    profileCreatedAt: "2026-09-20T00:00:00.000Z",
    ...overrides,
  };
}

function setFactors(factors: { status: string }[]) {
  mockAdmin.auth.admin.getUserById.mockResolvedValue({ data: { user: { factors } }, error: null });
}

describe("checkAdminMfa", () => {
  beforeEach(() => {
    mockAdmin.auth.admin.getUserById.mockReset();
  });

  it("fails for a post-cutoff account with no verified factor", async () => {
    setFactors([]);
    const result = await checkAdminMfa(mockAdmin as any, "u1", "2026-09-20T00:00:00.000Z");
    expect(result.ok).toBe(false);
    expect(result.hasVerifiedFactor).toBe(false);
    expect(result.isGrandfathered).toBe(false);
  });

  it("passes for a post-cutoff account with a verified TOTP factor", async () => {
    setFactors([{ status: "verified" }]);
    const result = await checkAdminMfa(mockAdmin as any, "u1", "2026-09-20T00:00:00.000Z");
    expect(result.ok).toBe(true);
    expect(result.hasVerifiedFactor).toBe(true);
  });

  it("an unverified-only factor list does not satisfy enforcement", async () => {
    setFactors([{ status: "unverified" }]);
    const result = await checkAdminMfa(mockAdmin as any, "u1", "2026-09-20T00:00:00.000Z");
    expect(result.ok).toBe(false);
    expect(result.hasVerifiedFactor).toBe(false);
  });

  it("grandfathers a pre-cutoff account with no factor (soft launch)", async () => {
    setFactors([]);
    const preCutoff = new Date(new Date(ADMIN_MFA_ENFORCEMENT_CUTOFF).getTime() - 1000).toISOString();
    const result = await checkAdminMfa(mockAdmin as any, "u1", preCutoff);
    expect(result.ok).toBe(true);
    expect(result.isGrandfathered).toBe(true);
    expect(result.hasVerifiedFactor).toBe(false);
  });

  it("does not grandfather an account created exactly at or after the cutoff", async () => {
    setFactors([]);
    const result = await checkAdminMfa(mockAdmin as any, "u1", ADMIN_MFA_ENFORCEMENT_CUTOFF);
    expect(result.ok).toBe(false);
    expect(result.isGrandfathered).toBe(false);
  });

  it("treats a missing profileCreatedAt as not-grandfathered (fail closed)", async () => {
    setFactors([]);
    const result = await checkAdminMfa(mockAdmin as any, "u1", null);
    expect(result.ok).toBe(false);
    expect(result.isGrandfathered).toBe(false);
  });
});

describe("requireAdminMfaForMutation", () => {
  beforeEach(() => {
    mockAdmin.auth.admin.getUserById.mockReset();
  });

  it("returns ok:true when the admin has a verified factor", async () => {
    setFactors([{ status: "verified" }]);
    const result = await requireAdminMfaForMutation(mockAdmin as any, makeAuth());
    expect(result.ok).toBe(true);
  });

  it("returns a 403 MFA_REQUIRED response when unenrolled and not grandfathered", async () => {
    setFactors([]);
    const result = await requireAdminMfaForMutation(mockAdmin as any, makeAuth());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.error.code).toBe("MFA_REQUIRED");
    }
  });

  it("returns ok:true when unenrolled but grandfathered (pre-cutoff account)", async () => {
    setFactors([]);
    const preCutoff = new Date(new Date(ADMIN_MFA_ENFORCEMENT_CUTOFF).getTime() - 1000).toISOString();
    const result = await requireAdminMfaForMutation(mockAdmin as any, makeAuth({ profileCreatedAt: preCutoff }));
    expect(result.ok).toBe(true);
  });

  it("fails closed (401) when the auth result has no userId at all", async () => {
    const result = await requireAdminMfaForMutation(mockAdmin as any, makeAuth({ userId: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("this applies equally to SUPER_ADMIN and ORGANIZATION_ADMIN — no role is exempt from enrollment", async () => {
    setFactors([]);
    for (const roleName of ["SUPER_ADMIN", "ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"]) {
      const result = await requireAdminMfaForMutation(mockAdmin as any, makeAuth({ roleName }));
      expect(result.ok, `role ${roleName} should not be exempt`).toBe(false);
    }
  });
});
