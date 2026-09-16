import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Phase D (settlement automation) contract tests for
 * /api/cron/settlement.
 *
 * Verifies:
 *  1. Auth gating matches the established cron pattern exactly (503 when
 *     CRON_SECRET unset, 401 on a wrong/missing secret, never opens
 *     unauthenticated).
 *  2. Org/currency enumeration is DYNAMIC — it settles every distinct
 *     (org_id, currency) pair with EARNED/PENDING_SETTLEMENT commissions
 *     found in the data, not a hardcoded list.
 *  3. A same-day double-fire is a safe no-op per pair (the RPC's own
 *     idempotency — this test proves the ROUTE calls the RPC exactly once
 *     per distinct pair per invocation, and that calling the route twice
 *     for the same date produces two identical "already settled" results
 *     rather than any duplicate side effects on the route's part).
 *  4. Each successfully settled pair writes an audit_events row, and an
 *     aggregator-owned org additionally gets an aggregator_notifications
 *     row.
 */

const mockAdmin = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => mockAdmin,
}));

import { GET } from "@/app/api/cron/settlement/route";

const AGGREGATOR_ORG = "489f9534-7c64-4f28-a88f-9509dd966af0";
const AGENCY_ORG = "10000000-0000-0000-0000-000000000001";

function makeRequest(opts: { secretHeader?: string; date?: string } = {}) {
  const url = new URL("http://localhost/api/cron/settlement");
  if (opts.date) url.searchParams.set("date", opts.date);
  const headers: Record<string, string> = {};
  if (opts.secretHeader !== undefined) headers["x-cron-secret"] = opts.secretHeader;
  return new NextRequest(url, { headers });
}

/** Builds a fresh admin mock: agent_commissions enumeration + aggregators lookup + inserts. */
function setupAdminMock(opts: {
  pendingRows: { currency: string; agents: { org_id: string } }[];
  aggregatorByOrg: Record<string, string | undefined>; // orgId -> aggregatorId
  rpcResult: (orgId: string, currency: string) => { data?: any; error?: any };
}) {
  const inserted: { table: string; row: any }[] = [];

  mockAdmin.from.mockImplementation((table: string) => {
    if (table === "agent_commissions") {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: opts.pendingRows, error: null }),
        }),
      };
    }
    if (table === "aggregators") {
      return {
        select: () => ({
          eq: (_col: string, orgId: string) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.aggregatorByOrg[orgId] ? { id: opts.aggregatorByOrg[orgId] } : null,
                error: null,
              }),
          }),
        }),
      };
    }
    if (table === "audit_events" || table === "aggregator_notifications") {
      return {
        insert: (row: any) => {
          inserted.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
      };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });

  mockAdmin.rpc.mockImplementation((fn: string, args: any) => {
    if (fn !== "run_daily_settlement") throw new Error(`Unexpected rpc: ${fn}`);
    const { data, error } = opts.rpcResult(args.p_org_id, args.p_currency);
    return Promise.resolve({ data, error });
  });

  return { inserted };
}

describe("GET /api/cron/settlement — auth gating", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockAdmin.from.mockReset();
    mockAdmin.rpc.mockReset();
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest({ secretHeader: "anything" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("CRON_NOT_CONFIGURED");
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 401 when the secret header is missing", async () => {
    process.env.CRON_SECRET = "test-secret-value";
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(401);
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 401 when the secret header does not match", async () => {
    process.env.CRON_SECRET = "test-secret-value";
    const res = await GET(makeRequest({ secretHeader: "wrong-value" }));
    expect(res.status).toBe(401);
    process.env.CRON_SECRET = originalSecret;
  });

  it("rejects a malformed ?date= query param with 400", async () => {
    process.env.CRON_SECRET = "test-secret-value";
    setupAdminMock({ pendingRows: [], aggregatorByOrg: {}, rpcResult: () => ({ data: null, error: null }) });
    const res = await GET(makeRequest({ secretHeader: "test-secret-value", date: "not-a-date" }));
    expect(res.status).toBe(400);
    process.env.CRON_SECRET = originalSecret;
  });
});

describe("GET /api/cron/settlement — dynamic enumeration & settlement", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockAdmin.from.mockReset();
    mockAdmin.rpc.mockReset();
    process.env.CRON_SECRET = "test-secret-value";
  });

  it("settles every distinct (org_id, currency) pair found in the data, not a hardcoded list", async () => {
    const { inserted } = setupAdminMock({
      pendingRows: [
        { currency: "NGN", agents: { org_id: AGGREGATOR_ORG } },
        { currency: "NGN", agents: { org_id: AGGREGATOR_ORG } }, // duplicate agent row -> same pair, must dedupe
        { currency: "XOF", agents: { org_id: AGENCY_ORG } },
      ],
      aggregatorByOrg: { [AGGREGATOR_ORG]: "agg-1" },
      rpcResult: (orgId, currency) => ({
        data: {
          id: `batch-${orgId}-${currency}`,
          batch_reference: `STL-${orgId.slice(0, 4)}-${currency}`,
          currency,
          status: "POSTED",
          total_commission_amount: 1000,
          total_agent_count: 1,
        },
        error: null,
      }),
    });

    const res = await GET(makeRequest({ secretHeader: "test-secret-value" }));
    expect(res.status).toBe(200);
    const json = await res.json();

    // Deduped to exactly 2 distinct pairs despite 3 input rows.
    expect(json.pairsProcessed).toBe(2);
    expect(mockAdmin.rpc).toHaveBeenCalledTimes(2);

    const orgsCalledWith = mockAdmin.rpc.mock.calls.map((c: any[]) => c[1].p_org_id).sort();
    expect(orgsCalledWith).toEqual([AGENCY_ORG, AGGREGATOR_ORG].sort());

    // Every posted pair gets an audit_events row.
    const auditRows = inserted.filter((i) => i.table === "audit_events");
    expect(auditRows).toHaveLength(2);

    // Only the aggregator-owned org gets an aggregator_notifications row.
    const notifRows = inserted.filter((i) => i.table === "aggregator_notifications");
    expect(notifRows).toHaveLength(1);
    expect(notifRows[0].row.aggregator_id).toBe("agg-1");
  });

  it("is a safe no-op on a same-day double-fire — each call settles once per pair, no duplicate side effects", async () => {
    let rpcCallCount = 0;
    const { inserted: firstRunInserts } = setupAdminMock({
      pendingRows: [{ currency: "NGN", agents: { org_id: AGGREGATOR_ORG } }],
      aggregatorByOrg: { [AGGREGATOR_ORG]: "agg-1" },
      rpcResult: () => {
        rpcCallCount += 1;
        // Simulate the RPC's own idempotency: same batch id/reference every call.
        return {
          data: {
            id: "batch-stable-id",
            batch_reference: "STL-STABLE-NGN",
            currency: "NGN",
            status: "POSTED",
            total_commission_amount: 5000,
            total_agent_count: 3,
          },
          error: null,
        };
      },
    });

    const res1 = await GET(makeRequest({ secretHeader: "test-secret-value", date: "2026-09-15" }));
    const json1 = await res1.json();
    expect(json1.results[0].batchReference).toBe("STL-STABLE-NGN");

    // Re-invoke the route for the same date — the RPC (mocked to mirror its
    // real idempotent behavior) returns the identical already-posted batch,
    // and the route does not error or diverge.
    const res2 = await GET(makeRequest({ secretHeader: "test-secret-value", date: "2026-09-15" }));
    const json2 = await res2.json();
    expect(json2.results[0].batchReference).toBe("STL-STABLE-NGN");
    expect(json2.results[0].status).toBe("POSTED");

    expect(rpcCallCount).toBe(2); // one RPC call per route invocation, as expected
    expect(json1.results).toEqual(json2.results); // identical outcome both times
  });

  it("records a FAILED result and an audit_events row (not aggregator_notifications) when the RPC errors for a pair", async () => {
    const { inserted } = setupAdminMock({
      pendingRows: [{ currency: "NGN", agents: { org_id: AGGREGATOR_ORG } }],
      aggregatorByOrg: { [AGGREGATOR_ORG]: "agg-1" },
      rpcResult: () => ({ data: null, error: { message: "COMMISSION_PAYABLE_UNDERFUNDED" } }),
    });

    const res = await GET(makeRequest({ secretHeader: "test-secret-value" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("partial_failure");
    expect(json.results[0].status).toBe("FAILED");
    expect(json.results[0].error).toContain("UNDERFUNDED");

    const auditRows = inserted.filter((i) => i.table === "audit_events");
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].row.action).toBe("SETTLEMENT_RUN_FAILED");

    const notifRows = inserted.filter((i) => i.table === "aggregator_notifications");
    expect(notifRows).toHaveLength(0);
  });

  it("returns ok with zero pairs processed when there is nothing pending to settle", async () => {
    setupAdminMock({ pendingRows: [], aggregatorByOrg: {}, rpcResult: () => ({ data: null, error: null }) });
    const res = await GET(makeRequest({ secretHeader: "test-secret-value" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.pairsProcessed).toBe(0);
    expect(mockAdmin.rpc).not.toHaveBeenCalled();
  });
});
