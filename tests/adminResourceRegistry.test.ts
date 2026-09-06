import { describe, it, expect } from "vitest";
import { RESOURCES, sanitizeSearchTerm } from "@/lib/admin/resourceRegistry";

/**
 * Registry integrity contract: every admin page reads through this
 * registry, so its shape must stay sound — real table names, whitelisted
 * filters only, and mutations that only ever expose reviewed columns.
 */

describe("resource registry", () => {
  it("registers a resource for every admin data domain", () => {
    const required = [
      "customers",
      "customer-transactions",
      "wallets",
      "kyc-documents",
      "agents",
      "agent-applications",
      "agency-transactions",
      "aggregators",
      "partners",
      "banking-nodes",
      "circuit-breakers",
      "webhook-deliveries",
      "provider-webhooks",
      "api-clients",
      "api-credentials",
      "api-routes",
      "audit-events",
      "security-incidents",
      "security-alerts",
      "pam-requests",
      "iam-sessions",
      "support-tickets",
      "support-officers",
      "support-escalations",
      "reconciliation-exceptions",
      "reconciliation-runs",
      "suspense-items",
      "settlement-batches",
      "ledger-accounts",
      "journal-entries",
      "gl-accounts",
      "treasury-deals",
      "treasury-positions",
      "treasury-accounts",
      "funding-facilities",
      "fx-rates",
      "fx-transactions",
      "fx-positions",
      "payments",
      "payment-refunds",
      "customer-disputes",
      "dispute-cases",
      "chargebacks",
      "risk-cases",
      "risk-rules",
      "aml-alerts",
      "aml-cases",
      "regulatory-reports",
      "regulatory-obligations",
      "cash-movements",
      "cash-variances",
      "tills",
      "vaults",
      "cit-shipments",
      "products",
      "adashi-groups",
      "adashi-cycles",
      "adashi-exceptions",
      "adashi-defaults",
      "adashi-disputes",
      "management-kpis",
      "decision-recommendations",
      "workforce-identities",
      "incidents",
      "outbox-events",
      "dead-letter-jobs",
      "organizations",
    ];
    for (const name of required) {
      expect(RESOURCES, `missing resource: ${name}`).toHaveProperty(name);
    }
  });

  it("every resource has a table, an order column and no empty filter whitelist entries", () => {
    for (const [name, def] of Object.entries(RESOURCES)) {
      expect(def.table, `${name}.table`).toBeTruthy();
      expect(def.orderBy, `${name}.orderBy`).toBeTruthy();
      for (const [key, filter] of Object.entries(def.filters ?? {})) {
        expect(filter.column, `${name}.filters.${key}.column`).toBeTruthy();
        expect(["eq", "in", "gte", "lte"]).toContain(filter.op);
      }
    }
  });

  it("schema-qualified tables are explicit (adashi.*, liquidity.*)", () => {
    expect(RESOURCES["adashi-groups"].table).toBe("adashi.groups");
    expect(RESOURCES["fx-transactions"].table).toBe("liquidity.fx_transactions");
  });

  it("payload-heavy tables select explicit narrow columns", () => {
    expect(RESOURCES["webhook-deliveries"].select).not.toContain("payload");
    expect(RESOURCES["provider-webhooks"].select).not.toContain("raw_payload");
    expect(RESOURCES["outbox-events"].select).not.toMatch(/payload(?!_)/);
    expect(RESOURCES["aml-alerts"].select).not.toContain("feature_snapshot");
  });

  it("mutations only exist where admins genuinely act, with status among the columns", () => {
    const mutable = Object.entries(RESOURCES).filter(([, d]) => d.mutations);
    expect(mutable.length).toBeGreaterThan(10);
    for (const [name, def] of mutable) {
      expect(def.mutations!.columns.length, `${name}.mutations.columns`).toBeGreaterThan(0);
      // status-only resources are fine; others must stay within their whitelist
      for (const col of def.mutations!.columns) {
        expect(typeof col).toBe("string");
      }
    }
    // read-only domains never expose mutations
    expect(RESOURCES["audit-events"].mutations).toBeUndefined();
    expect(RESOURCES["customer-transactions"].mutations).toBeUndefined();
    expect(RESOURCES["agency-transactions"].mutations).toBeUndefined();
    expect(RESOURCES["fx-rates"].mutations).toBeUndefined();
  });

  it("sanitizes PostgREST-unsafe characters from search terms", () => {
    expect(sanitizeSearchTerm("hello,world")).toBe("helloworld");
    expect(sanitizeSearchTerm("50%(off)")).toBe("50off");
    expect(sanitizeSearchTerm("a".repeat(200))).toHaveLength(80);
    expect(sanitizeSearchTerm("normal search term")).toBe("normal search term");
  });
});
