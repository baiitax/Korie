import { describe, it, expect } from "vitest";
import {
  AGGREGATOR_PERMISSIONS,
  aggregatorRoleHasPermission,
  type AggregatorPermission,
} from "@/lib/aggregator/permissions";
import { requireAggregatorPermission } from "@/lib/security/aggregatorPermissions";
import type { AuthenticatedAggregatorStaffContext } from "@/lib/security/aggregatorAuth";

/**
 * Regression guard for the September 2026 portal-hardening fix: privileged
 * aggregator staff actions (float dispatch, API key issuance, settlement
 * runs, agent onboarding, territory/target management, team invites,
 * compliance/risk/exception decisions) must reject any role that isn't
 * explicitly granted the permission. Before this fix, most of these routes
 * had no role check at all — any authenticated staff member, including
 * read-only AUDITOR/ANALYST, could perform them. This suite asserts that
 * can never silently regress, and that OWNER/ADMIN always retain full
 * access (they are the org's accountable principals).
 */

const ALL_ROLES: AuthenticatedAggregatorStaffContext["role"][] = [
  "AGGREGATOR_OWNER",
  "AGGREGATOR_ADMIN",
  "OPERATIONS_MANAGER",
  "FINANCE_MANAGER",
  "COMPLIANCE_OFFICER",
  "RISK_OFFICER",
  "FIELD_OFFICER",
  "AUDITOR",
  "ANALYST",
];

function fakeStaff(role: AuthenticatedAggregatorStaffContext["role"]): AuthenticatedAggregatorStaffContext {
  return {
    staffId: "staff-1",
    aggregatorId: "agg-1",
    orgId: "org-1",
    authUserId: "auth-1",
    fullName: "Test Staff",
    email: "staff@example.com",
    role,
    territoryScope: [],
    aggregatorStatus: "ACTIVE",
    kybStatus: "VERIFIED",
    requestId: "KP-REQ-TEST",
  };
}

describe("aggregator permission matrix", () => {
  it("OWNER and ADMIN carry every declared permission", () => {
    for (const permission of AGGREGATOR_PERMISSIONS) {
      expect(aggregatorRoleHasPermission("AGGREGATOR_OWNER", permission)).toBe(true);
      expect(aggregatorRoleHasPermission("AGGREGATOR_ADMIN", permission)).toBe(true);
    }
  });

  it("AUDITOR and ANALYST carry no privileged permission (read-only by construction)", () => {
    for (const permission of AGGREGATOR_PERMISSIONS) {
      expect(aggregatorRoleHasPermission("AUDITOR", permission)).toBe(false);
      expect(aggregatorRoleHasPermission("ANALYST", permission)).toBe(false);
    }
  });

  it("every permission except the deliberately Owner/Admin-only ones is delegated to at least one other role", () => {
    // aggregator.keys.manage (production API credentials), aggregator.team.manage
    // (who else gets access at all), and aggregator.security.manage (MFA
    // enforcement + IP allowlist) are the three categories intentionally
    // NOT delegated below Owner/Admin — minting a money-moving API key,
    // adding a new staff member, or changing how the whole organization
    // authenticates are the org's own accountable-principal decisions, not
    // something Operations/Finance should be able to do unilaterally.
    const OWNER_ADMIN_ONLY: AggregatorPermission[] = ["aggregator.keys.manage", "aggregator.team.manage", "aggregator.security.manage"];
    const delegatedRoles = ALL_ROLES.filter((r) => r !== "AGGREGATOR_OWNER" && r !== "AGGREGATOR_ADMIN");
    for (const permission of AGGREGATOR_PERMISSIONS) {
      if (OWNER_ADMIN_ONLY.includes(permission)) {
        expect(delegatedRoles.some((role) => aggregatorRoleHasPermission(role, permission))).toBe(false);
        continue;
      }
      const hasDelegate = delegatedRoles.some((role) => aggregatorRoleHasPermission(role, permission));
      expect(hasDelegate, `no non-owner/admin role holds "${permission}"`).toBe(true);
    }
  });

  it.each<[AggregatorPermission, AuthenticatedAggregatorStaffContext["role"][]]>([
    ["aggregator.liquidity.dispatch", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "OPERATIONS_MANAGER", "FINANCE_MANAGER"]],
    ["aggregator.settlements.run", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "FINANCE_MANAGER"]],
    ["aggregator.reconciliation.run", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "FINANCE_MANAGER"]],
    ["aggregator.agents.onboard", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "OPERATIONS_MANAGER"]],
    ["aggregator.territories.manage", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "OPERATIONS_MANAGER"]],
    ["aggregator.targets.manage", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "OPERATIONS_MANAGER"]],
    ["aggregator.keys.manage", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN"]],
    ["aggregator.team.manage", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN"]],
    ["aggregator.security.manage", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN"]],
    ["aggregator.compliance.decide", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "COMPLIANCE_OFFICER"]],
    ["aggregator.risk.acknowledge", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "RISK_OFFICER"]],
    ["aggregator.exceptions.resolve", ["AGGREGATOR_OWNER", "AGGREGATOR_ADMIN", "OPERATIONS_MANAGER", "FINANCE_MANAGER", "COMPLIANCE_OFFICER", "RISK_OFFICER"]],
  ])("%s is granted exactly to %j and denied to every other role", (permission, allowedRoles) => {
    for (const role of ALL_ROLES) {
      const expected = allowedRoles.includes(role);
      expect(
        aggregatorRoleHasPermission(role, permission),
        `role ${role} should ${expected ? "" : "NOT "}have "${permission}"`,
      ).toBe(expected);
    }
  });

  it("requireAggregatorPermission returns ok:true for a granted role and a 403 FORBIDDEN_PERMISSION response for a denied role", () => {
    const owner = fakeStaff("AGGREGATOR_OWNER");
    const ok = requireAggregatorPermission(owner, "aggregator.liquidity.dispatch");
    expect(ok.ok).toBe(true);

    const auditor = fakeStaff("AUDITOR");
    const denied = requireAggregatorPermission(auditor, "aggregator.liquidity.dispatch");
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.response.status).toBe(403);
    }
  });

  it("FIELD_OFFICER holds none of the currently-declared privileged permissions", () => {
    for (const permission of AGGREGATOR_PERMISSIONS) {
      expect(aggregatorRoleHasPermission("FIELD_OFFICER", permission)).toBe(false);
    }
  });
});
