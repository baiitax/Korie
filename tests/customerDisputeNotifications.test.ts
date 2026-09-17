import { describe, it, expect } from "vitest";
import { buildDisputeOutcomeNotification } from "@/lib/support/supportDb";

/**
 * PS-9 (roadmap 3.2): what the customer's bell is told about a dispute
 * outcome. The wording must state only what actually happened — decision
 * type, references, and the amount the LEDGER posted (never the claim
 * amount, never the officers' internal reasoning).
 */

const base = {
  disputeNumber: "DSC-2026-0035",
  transactionReference: "KP-2026-CTX-94F2AAF9",
};

describe("buildDisputeOutcomeNotification", () => {
  it("approved refunds quote the posted amount and recovery reference", () => {
    const n = buildDisputeOutcomeNotification({
      ...base,
      decisionType: "PARTIAL_REFUND",
      currency: "XOF",
      approvedAmount: 2000,
      recoveryCaseReference: "RC-2026-0001",
    });
    expect(n.severity).toBe("INFO");
    expect(n.title).toContain("DSC-2026-0035");
    expect(n.title).toContain("partial refund");
    expect(n.body).toContain("XOF 2,000");
    expect(n.body).toContain("RC-2026-0001");
    expect(n.body).toContain("KP-2026-CTX-94F2AAF9");
  });

  it("rejections are a WARNING and never leak the officers' reasoning", () => {
    const n = buildDisputeOutcomeNotification({ ...base, decisionType: "REJECTED" });
    expect(n.severity).toBe("WARNING");
    expect(n.title).toContain("claim reviewed");
    expect(n.body).not.toContain("because");
    expect(n.body).toContain("unable to uphold");
  });

  it("under-investigation tells the customer the team has it, not a verdict", () => {
    const n = buildDisputeOutcomeNotification({ ...base, decisionType: "UNDER_INVESTIGATION" });
    expect(n.severity).toBe("INFO");
    expect(n.body).toContain("specialist team");
  });

  it("reversal approvals say reversal, not refund", () => {
    const n = buildDisputeOutcomeNotification({ ...base, decisionType: "REVERSAL_APPROVED", currency: "NGN", approvedAmount: 48500 });
    expect(n.title).toContain("reversal approved");
    expect(n.body).toContain("NGN 48,500");
  });

  it("survives a missing transaction reference and amount without inventing them", () => {
    const n = buildDisputeOutcomeNotification({ disputeNumber: "DSC-2026-0001", decisionType: "REFUND_APPROVED" });
    expect(n.body).not.toContain("transaction");
    expect(n.body).not.toContain("credited");
    expect(n.body).toContain("approved");
  });

  it("unknown decision types fall back to a neutral status-update wording", () => {
    const n = buildDisputeOutcomeNotification({ ...base, decisionType: "SOMETHING_ELSE" });
    expect(n.title).toContain("status update");
  });
});
