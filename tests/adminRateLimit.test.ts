import { describe, it, expect } from "vitest";
import { enforceAdminRateLimit } from "@/lib/security/adminRateLimit";

/**
 * Regression guard for ADMIN_PORTAL_REVIEW.md finding #5: admin/compliance
 * routes must throttle requests per AUTHENTICATED ACTOR (never bare IP),
 * matching the existing rateLimiter.ts categories/thresholds.
 */

describe("enforceAdminRateLimit", () => {
  it("allows requests under the category threshold", () => {
    const result = enforceAdminRateLimit("actor-under-limit-1", "admin", "FINANCIAL");
    expect(result.ok).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("blocks with 429 + Retry-After once an actor exceeds the FINANCIAL threshold (300/min)", () => {
    const actor = "actor-over-financial-limit";
    let lastResult;
    for (let i = 0; i < 301; i++) {
      lastResult = enforceAdminRateLimit(actor, "admin", "FINANCIAL");
    }
    expect(lastResult!.ok).toBe(false);
    expect(lastResult!.response!.status).toBe(429);
    expect(lastResult!.response!.headers.get("Retry-After")).toBeTruthy();
  });

  it("keys distinctly per actor — a busy actor does not throttle a different actor", () => {
    const busyActor = "actor-busy";
    for (let i = 0; i < 301; i++) enforceAdminRateLimit(busyActor, "admin", "FINANCIAL");
    const busyResult = enforceAdminRateLimit(busyActor, "admin", "FINANCIAL");
    expect(busyResult.ok).toBe(false);

    const freshActor = "actor-fresh";
    const freshResult = enforceAdminRateLimit(freshActor, "admin", "FINANCIAL");
    expect(freshResult.ok).toBe(true);
  });

  it("keys distinctly per surface — admin and compliance don't share a budget for the same actor id", () => {
    const actor = "actor-shared-identity";
    for (let i = 0; i < 301; i++) enforceAdminRateLimit(actor, "admin", "FINANCIAL");
    const adminResult = enforceAdminRateLimit(actor, "admin", "FINANCIAL");
    expect(adminResult.ok).toBe(false);

    const complianceResult = enforceAdminRateLimit(actor, "compliance", "FINANCIAL");
    expect(complianceResult.ok).toBe(true);
  });

  it("falls back to a stable 'unknown' key rather than throwing when actorId is undefined", () => {
    expect(() => enforceAdminRateLimit(undefined, "admin", "READ")).not.toThrow();
  });
});
