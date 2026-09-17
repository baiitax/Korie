import { describe, it, expect } from "vitest";
import { DISPUTE_BUMP_LADDER, AGING_DISPUTE_STATUSES } from "@/lib/support/agingSweep";

/**
 * Aging sweep invariants (roadmap 3.3): the dispute bump ladder climbs ONE
 * step per run and terminates at URGENT — repeated runs (hourly cron,
 * double-runs) converge instead of oscillating or looping, which is the
 * sweep's idempotency for the dispute pass.
 */

describe("DISPUTE_BUMP_LADDER", () => {
  it("climbs one step per run", () => {
    expect(DISPUTE_BUMP_LADDER["LOW"]).toBe("NORMAL");
    expect(DISPUTE_BUMP_LADDER["NORMAL"]).toBe("HIGH");
    expect(DISPUTE_BUMP_LADDER["HIGH"]).toBe("URGENT");
  });

  it("stops at URGENT — the fixpoint that makes repeated sweeps idempotent", () => {
    expect(DISPUTE_BUMP_LADDER["URGENT"]).toBeUndefined();
  });

  it("never notifies about an unknown priority (no ladder entry, no bump)", () => {
    expect(DISPUTE_BUMP_LADDER["SOMETHING_ELSE"]).toBeUndefined();
  });
});

describe("AGING_DISPUTE_STATUSES", () => {
  it("covers undecided disputes but not the maker-checker queue or settled ones", () => {
    expect(AGING_DISPUTE_STATUSES).toEqual(["OPEN", "UNDER_REVIEW", "REQUESTED_INFORMATION", "ESCALATED"]);
    expect(AGING_DISPUTE_STATUSES).not.toContain("DECISION"); // covered by the checker reminder pass
    expect(AGING_DISPUTE_STATUSES).not.toContain("RESOLVED");
    expect(AGING_DISPUTE_STATUSES).not.toContain("CLOSED");
  });
});
