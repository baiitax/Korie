import { describe, it, expect, vi } from "vitest";
import { dualControlTriggered, checkDualControl, type DualControlGuard } from "@/lib/security/dualControl";
import { RESOURCES } from "@/lib/admin/resourceRegistry";

/**
 * Regression guard for ADMIN_PORTAL_REVIEW.md finding #3: a lone
 * SUPER_ADMIN must not be able to close a security incident (or any other
 * dualControlGuard-declared transition) unilaterally — two DISTINCT admins
 * must each submit the same guarded change before it is applied.
 */

const guard: DualControlGuard = {
  column: "status",
  triggerValues: ["CLOSED"],
  requiredApprovals: 2,
  approvalType: "SECURITY_INCIDENT_CLOSE",
};

describe("dualControlTriggered", () => {
  it("is triggered when the patch sets the guarded column to a trigger value", () => {
    expect(dualControlTriggered(guard, { status: "CLOSED" })).toBe(true);
  });

  it("is not triggered for a non-trigger value on the same column", () => {
    expect(dualControlTriggered(guard, { status: "INVESTIGATING" })).toBe(false);
  });

  it("is not triggered when the patch doesn't touch the guarded column at all", () => {
    expect(dualControlTriggered(guard, { incident_commander: "someone@koriepay.internal" })).toBe(false);
  });
});

describe("checkDualControl", () => {
  it("applies immediately (no vote recorded) when the patch doesn't trigger the guard", async () => {
    const admin = { rpc: vi.fn() } as any;
    const outcome = await checkDualControl(admin, guard, "inc-1", { status: "TRIAGED" }, "admin-a");
    expect(outcome.applied).toBe(true);
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("does not apply after only one distinct admin has voted", async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: 1, error: null }) } as any;
    const outcome = await checkDualControl(admin, guard, "inc-1", { status: "CLOSED" }, "admin-a");
    expect(outcome.applied).toBe(false);
    expect(outcome.approvals).toBe(1);
    expect(outcome.required).toBe(2);
    expect(admin.rpc).toHaveBeenCalledWith(
      "record_control_approval",
      expect.objectContaining({ p_approval_type: "SECURITY_INCIDENT_CLOSE", p_reference_id: "inc-1", p_actor_id: "admin-a", p_decision: "APPROVE" }),
    );
  });

  it("applies once the required number of DISTINCT admins have voted", async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: 2, error: null }) } as any;
    const outcome = await checkDualControl(admin, guard, "inc-1", { status: "CLOSED" }, "admin-b");
    expect(outcome.applied).toBe(true);
    expect(outcome.approvals).toBe(2);
  });

  it("fails closed (does not apply) if recording the vote itself errors", async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("db down") }) } as any;
    const outcome = await checkDualControl(admin, guard, "inc-1", { status: "CLOSED" }, "admin-a");
    expect(outcome.applied).toBe(false);
    expect(outcome.approvals).toBe(0);
  });
});

describe("resource registry dual-control coverage", () => {
  it("security-incidents requires 2 distinct approvals to close, matching the role's own promised control", () => {
    const def = RESOURCES["security-incidents"];
    expect(def.mutations?.dualControlGuard).toEqual({
      column: "status",
      triggerValues: ["CLOSED"],
      requiredApprovals: 2,
      approvalType: "SECURITY_INCIDENT_CLOSE",
    });
  });
});
