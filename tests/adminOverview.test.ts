import { describe, it, expect } from "vitest";
import { buildAdminOverview, OverviewDb } from "@/lib/admin/overviewData";

/**
 * Overview builder contract tests.
 *
 * The admin dashboard must never fabricate: counts come from what the stub
 * database returns (zero stays zero), a failing table degrades exactly its
 * own section, and banking-node telemetry maps honestly — unknown stays
 * unknown.
 */

function makeDb(opts: {
  counts?: Record<string, number>; // table(+filter) -> count
  transactions?: any[];
  nodes?: any[];
  audit?: any[];
  failTables?: string[];
  failRolesProbe?: boolean;
}): OverviewDb {
  return {
    from(table: string) {
      let selectedCols = "";
      let filters: string[] = [];
      const chain: any = {
        select(cols: string, _opts?: any) {
          selectedCols = cols;
          return chain;
        },
        eq(col: string, val: string) {
          filters.push(`${table}:${col}=${val}`);
          return chain;
        },
        order(_col: string, _opts?: any) {
          return chain;
        },
        limit(_n: number) {
          return chain;
        },
        then(resolve: any, reject: any) {
          if (opts.failTables?.includes(table) || (table === "roles" && opts.failRolesProbe)) {
            return Promise.reject(new Error(`table ${table} unavailable`)).then(resolve, reject);
          }
          if (table === "roles") {
            return Promise.resolve({ data: [], error: null }).then(resolve, reject);
          }
          // Bounded volume window: full rows for amount/currency/status
          if (table === "customer_transactions" && /amount/.test(selectedCols)) {
            return Promise.resolve({ data: opts.transactions ?? [], error: null }).then(resolve, reject);
          }
          if (table === "provider_nodes") {
            return Promise.resolve({ data: opts.nodes ?? [], error: null }).then(resolve, reject);
          }
          if (table === "audit_events") {
            return Promise.resolve({ data: opts.audit ?? [], error: null }).then(resolve, reject);
          }
          // Head-count queries: count = filters ? filtered : total
          const key = filters.length ? filters.join("&") : `${table}:*`;
          const total = opts.counts?.[`${table}:*`] ?? 0;
          const filtered = opts.counts?.[key] ?? 0;
          return Promise.resolve({ count: filters.length ? filtered : total, error: null }).then(resolve, reject);
        },
      };
      return chain;
    },
  };
}

describe("buildAdminOverview", () => {
  it("computes counts, status splits and volume from real rows", async () => {
    const db = makeDb({
      counts: {
        "customers:*": 120,
        "customers:status=ACTIVE": 100,
        "agents:*": 12,
        "agents:status=ACTIVE": 9,
        "agent_onboarding_applications:status=PENDING": 3,
        "customer_transactions:*": 4,
        "agency_transactions:*": 7,
        "customer_kyc_documents:status=PENDING": 5,
        "customer_disputes:status=OPEN": 2,
        "reconciliation_exceptions:status=OPEN": 1,
        "incident_records:status=OPEN": 0,
        "outbox_events:status=PENDING": 6,
        "outbox_events:status=FAILED": 1,
      },
      transactions: [
        { amount: 100000, currency: "NGN", status: "SUCCESSFUL" },
        { amount: 200000, currency: "NGN", status: "SUCCESSFUL" },
        { amount: 50000, currency: "XOF", status: "FAILED" },
        { amount: 25000, currency: "XOF", status: "PENDING" },
      ],
      audit: [{ id: "1", action: "ADMIN_SIGNED_IN", actor_email: "ops@koriepay.ng", actor_role: "SUPER_ADMIN", resource_type: "SESSION", created_at: "2026-09-06T10:00:00Z" }],
    });

    const o = await buildAdminOverview(db);

    expect(o.systemHealth.database).toBe("operational");
    expect(o.customers).toEqual({ status: "ok", data: { total: 120, active: 100 } });
    expect(o.agents.data).toEqual({ total: 12, active: 9, pendingApplications: 3 });
    expect(o.customerTransactions.data?.total).toBe(4);
    expect(o.customerTransactions.data?.successful).toBe(2);
    expect(o.customerTransactions.data?.failed).toBe(1);
    expect(o.customerTransactions.data?.pending).toBe(1);
    expect(o.customerTransactions.data?.volumeNgn).toBe(300000);
    expect(o.customerTransactions.data?.volumeXof).toBe(75000);
    expect(o.customerTransactions.data?.volumeWindowLabel).toBe("all recorded transactions");
    expect(o.agencyTransactions.data?.total).toBe(7);
    expect(o.kycQueue.data?.pending).toBe(5);
    expect(o.disputes.data?.open).toBe(2);
    expect(o.reconciliation.data?.openExceptions).toBe(1);
    expect(o.incidents.data?.open).toBe(0);
    expect(o.outbox.data).toEqual({ pending: 6, failed: 1 });
    expect(o.activity.events).toHaveLength(1);
    expect(o.activity.events[0].action).toBe("ADMIN_SIGNED_IN");
  });

  it("degrades only the failing section — everything else still reports", async () => {
    const db = makeDb({
      counts: { "customers:*": 42 },
      failTables: ["customer_transactions", "customer_kyc_documents"],
    });
    const o = await buildAdminOverview(db);

    expect(o.customerTransactions.status).toBe("unavailable");
    expect(o.customerTransactions.data).toBeUndefined();
    expect(o.kycQueue.status).toBe("unavailable");
    expect(o.customers.status).toBe("ok");
    expect(o.customers.data?.total).toBe(42);
  });

  it("never invents counts — an empty database reports honest zeros", async () => {
    const o = await buildAdminOverview(makeDb({}));
    expect(o.customers.data?.total).toBe(0);
    expect(o.customerTransactions.data?.total).toBe(0);
    expect(o.customerTransactions.data?.volumeNgn).toBe(0);
    expect(o.activity.events).toEqual([]);
  });

  it("maps provider-node telemetry honestly and keeps unknown as unknown", async () => {
    const db = makeDb({
      nodes: [
        { code: "PROVIDUS_NG", status: "ACTIVE", circuit_breaker_state: "CLOSED", latency_ms: 210, success_rate_24h: 0.994, last_ping_at: "2026-09-06T09:00:00Z" },
        { code: "CORIS_NE", status: "DEGRADED", circuit_breaker_state: "HALF_OPEN", latency_ms: 1800, success_rate_24h: 0.71, last_ping_at: null },
      ],
    });
    const o = await buildAdminOverview(db);
    const [providus, coris] = o.bankingNodes.nodes;

    expect(providus.name).toBe("Providus Bank");
    expect(providus.status).toBe("operational");
    expect(providus.source).toBe("provider_nodes");
    expect(providus.latencyMs).toBe(210);

    expect(coris.name).toBe("Coris Bank");
    expect(coris.status).toBe("degraded");

    // No telemetry row at all → unknown, never operational
    const empty = await buildAdminOverview(makeDb({ nodes: [] }));
    for (const n of empty.bankingNodes.nodes) {
      expect(n.status).toBe("unknown");
      expect(n.source).toBe("no-telemetry");
    }
  });

  it("reports the database as unreachable when the probe fails", async () => {
    const o = await buildAdminOverview(makeDb({ failRolesProbe: true }));
    expect(o.systemHealth.database).toBe("unreachable");
    // API + auth are still proven by the response itself
    expect(o.systemHealth.api).toBe("operational");
    expect(o.systemHealth.auth).toBe("operational");
    expect(o.systemHealth.transactionEngine).toBe("unknown");
  });
});
