// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { useAdminResource, mutateAdminRecord } from "@/lib/admin/useAdminResource";
import ResourceTable from "@/components/admin/ResourceTable";

/**
 * Client data-path contract: the hooks and ResourceTable talk to
 * /api/admin/data/* and render ONLY what the API returned — honest
 * loading, honest errors, honest empty states, no invented rows.
 */

vi.mock("@/lib/admin/adminSession", () => ({
  adminApiFetch: vi.fn(),
}));

import { adminApiFetch } from "@/lib/admin/adminSession";
const mockFetch = adminApiFetch as ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: async () => body,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("useAdminResource", () => {
  it("renders rows and exact count from the API response", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        status: "ok",
        resource: "agents",
        rows: [{ id: "a1", agent_code: "AG-001", trading_name: "Garba Ventures", status: "ACTIVE" }],
        count: 41,
        limit: 100,
        offset: 0,
      }),
    );

    function Probe() {
      const { rows, count, loading, error } = useAdminResource("agents", {});
      return React.createElement("div", null,
        React.createElement("span", { "data-testid": "loading" }, String(loading)),
        React.createElement("span", { "data-testid": "count" }, String(count)),
        React.createElement("span", { "data-testid": "error" }, error ? error.kind : "none"),
        React.createElement("span", { "data-testid": "rows" }, rows.map((r) => (r as Record<string, unknown>).agent_code).join(",")),
      );
    }
    render(React.createElement(Probe));

    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("41"));
    expect(screen.getByTestId("rows").textContent).toBe("AG-001");
    expect(screen.getByTestId("error").textContent).toBe("none");
    expect(mockFetch).toHaveBeenCalled();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/admin/data/agents?");
    expect(calledUrl).toContain("limit=100");
  });

  it("maps 401 to an unauthenticated error and renders zero rows", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ status: "error", error: { code: "UNAUTHORIZED_MISSING_TOKEN", message: "no session" } }, 401),
    );
    function Probe() {
      const { rows, count, error } = useAdminResource("wallets", {});
      return React.createElement("div", null,
        React.createElement("span", { "data-testid": "kind" }, error ? error.kind : "none"),
        React.createElement("span", { "data-testid": "count" }, String(count)),
        React.createElement("span", { "data-testid": "rows" }, String(rows.length)),
      );
    }
    render(React.createElement(Probe));
    await waitFor(() => expect(screen.getByTestId("kind").textContent).toBe("unauthenticated"));
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("rows").textContent).toBe("0");
  });

  it("maps 503 backend-unavailable to the backend error kind", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ status: "error", error: { code: "ADMIN_BACKEND_NOT_CONFIGURED", message: "no env" } }, 503),
    );
    function Probe() {
      const { error } = useAdminResource("customers", {});
      return React.createElement("span", { "data-testid": "kind" }, error ? error.kind : "none");
    }
    render(React.createElement(Probe));
    await waitFor(() => expect(screen.getByTestId("kind").textContent).toBe("backend"));
  });
});

describe("ResourceTable", () => {
  it("renders real rows with a pagination footer, then an honest empty state", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        rows: [
          { id: "t1", reference: "KP-TEST-1", amount: 5000, currency: "NGN", status: "SUCCESSFUL" },
          { id: "t2", reference: "KP-TEST-2", amount: 7500, currency: "NGN", status: "FAILED" },
        ],
        count: 2,
      }),
    );
    render(
      React.createElement(ResourceTable, {
        resource: "customer-transactions",
        columns: [
          { key: "reference", label: "Reference" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
        ],
      }),
    );
    await waitFor(() => expect(screen.getByText("KP-TEST-1")).toBeTruthy());
    expect(screen.getByText(/Showing 1–2 of 2 records/)).toBeTruthy();

    // Next page of data: empty database stays empty — no fabricated rows
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: "ok", rows: [], count: 0 }));
    render(
      React.createElement(ResourceTable, {
        resource: "customer-transactions",
        columns: [{ key: "reference", label: "Reference" }],
        searchPlaceholder: "search",
      }),
    );
    await waitFor(() => expect(screen.getByText(/No records found/i)).toBeTruthy());
  });
});

describe("mutateAdminRecord", () => {
  it("PATCHes the record and returns the updated row", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "ok", resource: "kyc-documents", record: { id: "d1", status: "APPROVED" } }),
    );
    const res = await mutateAdminRecord("kyc-documents", "d1", { status: "APPROVED" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.record.status).toBe("APPROVED");
    expect(mockFetch.mock.calls[0][1]?.method).toBe("PATCH");
  });

  it("surfaces the server's rejection message on failure", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "error", error: { code: "MUTATION_NOT_ALLOWED", message: "read-only resource" } }, 403),
    );
    const res = await mutateAdminRecord("audit-events", "x", { status: "HACKED" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("read-only");
  });
});
