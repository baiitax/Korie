import { describe, it, expect } from "vitest";
import { severityFromPriority, BRIDGE_DESTINATIONS } from "@/lib/compliance/escalationBridge";
import { deriveNotifications, type DerivedInputs } from "@/services/compliance/derive";
import type { AlertRow, CaseRow, ObligationRow, ApprovalRow } from "@/services/compliance/types";

/**
 * Escalation bridge invariants (roadmap 3.1, PS-6).
 *
 * The bridge turns a support escalation into a real aml_alerts referral row.
 * These tests pin the pure decisions: the priority→severity mapping, and the
 * bell derivation — which must show referrals because rows exist, never
 * invent them, and never hide an un-bridged referral (that is a gap an
 * officer must see).
 */

const baseInputs = (referrals: NonNullable<DerivedInputs["referrals"]>): DerivedInputs => ({
  alerts: [] as AlertRow[],
  cases: [] as CaseRow[],
  obligations: [] as ObligationRow[],
  approvals: [] as ApprovalRow[],
  decisions: [],
  kyc: [],
  kyb: [],
  health: null,
  referrals,
});

const referral = (over: Partial<NonNullable<DerivedInputs["referrals"]>[number]> = {}) => ({
  id: "esc-1",
  escalationNumber: "ESC-2026-0001",
  ticketId: "ticket-1",
  reason: "Customer could not explain the source of rapid inbound transfers.",
  priority: "HIGH",
  destination: "COMPLIANCE",
  status: "PENDING",
  externalRef: "KPC-AL-20260917-ABC12",
  slaDueAt: "2026-09-18T00:00:00.000Z",
  createdAt: "2026-09-17T00:00:00.000Z",
  ...over,
});

describe("severityFromPriority", () => {
  it("maps support priorities onto the AML severity enum", () => {
    expect(severityFromPriority("URGENT")).toBe("P0_CRITICAL");
    expect(severityFromPriority("CRITICAL")).toBe("P0_CRITICAL");
    expect(severityFromPriority("HIGH")).toBe("P1_HIGH");
    expect(severityFromPriority("NORMAL")).toBe("P2_MEDIUM");
    expect(severityFromPriority("LOW")).toBe("P3_LOW");
  });

  it("defaults unknown priorities to medium rather than guessing high", () => {
    expect(severityFromPriority("WHATEVER")).toBe("P2_MEDIUM");
  });
});

describe("deriveNotifications with support referrals", () => {
  it("shows a bridged COMPLIANCE referral with its linked alert", () => {
    const rows = deriveNotifications(baseInputs([referral()]));
    const n = rows.find((r) => r.id === "n-referral-esc-1");
    expect(n).toBeDefined();
    expect(n!.title).toContain("ESC-2026-0001");
    expect(n!.title).toContain("KPC-AL-20260917-ABC12");
    expect(n!.body).toContain("COMPLIANCE");
  });

  it("shows an un-bridged referral as a gap, not as a linked record", () => {
    const rows = deriveNotifications(baseInputs([referral({ externalRef: undefined })]));
    const n = rows.find((r) => r.id === "n-referral-esc-1");
    expect(n).toBeDefined();
    expect(n!.title).toContain("not bridged");
    expect(n!.body).toContain("no compliance alert linked");
  });

  it("ignores escalations to desks that are not compliance's business", () => {
    const rows = deriveNotifications(
      baseInputs([referral({ id: "esc-2", destination: "ENGINEERING" }), referral({ id: "esc-3", destination: "FINANCE" })]),
    );
    expect(rows.find((r) => r.id.startsWith("n-referral-"))).toBeUndefined();
  });

  it("drops resolved referrals from the bell", () => {
    const rows = deriveNotifications(baseInputs([referral({ status: "RESOLVED" })]));
    expect(rows.find((r) => r.id === "n-referral-esc-1")).toBeUndefined();
  });

  it("never emits referral notifications when no referral rows exist", () => {
    const rows = deriveNotifications(baseInputs([]));
    expect(rows.filter((r) => r.id.startsWith("n-referral-"))).toHaveLength(0);
  });
});

describe("BRIDGE_DESTINATIONS", () => {
  it("covers exactly the compliance-relevant destinations", () => {
    expect([...BRIDGE_DESTINATIONS]).toEqual(["COMPLIANCE", "FRAUD_RISK"]);
  });
});
