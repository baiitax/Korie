"use client";

import React, { useState } from "react";
import { PageHeader, fmtAgo, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Banking nodes — live provider_nodes telemetry plus circuit breaker
 * states. The old page seeded two node cards and faked a "ping" animation;
 * health here is whatever the telemetry pipeline last recorded (a node
 * without telemetry says so).
 */
export default function BankingNodesPage() {
  const [tab, setTab] = useState<"nodes" | "breakers">("nodes");

  const nodeCols: ResourceColumn[] = [
    { key: "code", label: "Node", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.code}</span> },
    { key: "name", label: "Provider" },
    { key: "country", label: "Country" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
    { key: "is_active", label: "Enabled", render: (r) => <span className={r.is_active ? "text-emerald-400" : "text-slate-400"}>{r.is_active ? "Yes" : "No"}</span> },
    { key: "circuit_breaker_state", label: "Breaker", render: (r) => <StatusChip value={r.circuit_breaker_state} /> },
    { key: "latency_ms", label: "Latency", className: "text-right", render: (r) => <span className={Number(r.latency_ms) > 1000 ? "text-amber-400" : "text-[var(--foreground-muted)]"}>{r.latency_ms ?? "—"}{r.latency_ms != null ? "ms" : ""}</span> },
    { key: "success_rate_24h", label: "24h success", className: "text-right", render: (r) => <span className={Number(r.success_rate_24h) < 0.95 ? "text-amber-400" : "text-emerald-400"}>{r.success_rate_24h != null ? `${(Number(r.success_rate_24h) * 100).toFixed(1)}%` : "—"}</span> },
    { key: "last_ping_at", label: "Last ping", render: (r) => <span className="text-[var(--foreground-muted)]">{r.last_ping_at ? fmtAgo(r.last_ping_at) : "no telemetry"}</span> },
  ];

  const breakerCols: ResourceColumn[] = [
    { key: "service_key", label: "Service", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.service_key}</span> },
    { key: "service_name", label: "Name", hideOnMobile: true },
    { key: "tier", label: "Tier" },
    { key: "state", label: "State", render: (r) => <StatusChip value={r.state} /> },
    { key: "failure_count", label: "Failures", className: "text-right" },
    { key: "failure_threshold", label: "Threshold", className: "text-right" },
    { key: "trip_reason", label: "Trip reason", hideOnMobile: true },
    { key: "last_failure_at", label: "Last failure", render: (r) => <span className="text-[var(--foreground-muted)]">{r.last_failure_at ? fmtAgo(r.last_failure_at) : "—"}</span> },
    { key: "updated_at", label: "Updated", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.updated_at)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Banking Nodes"
        title="Provider Nodes & Circuit Breakers"
        subtitle="Banking connectivity telemetry (Providus Bank NG, Coris Bank NE) and circuit breaker states, exactly as the health pipeline recorded them. Nodes without telemetry are shown as such — never assumed healthy."
      />

      <div className="flex gap-2 text-xs font-bold">
        {(["nodes", "breakers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "nodes" ? "Provider nodes" : "Circuit breakers"}
          </button>
        ))}
      </div>

      {tab === "nodes" ? (
        <ResourceTable
          resource="banking-nodes"
          columns={nodeCols}
          exportName="banking-nodes"
          searchPlaceholder="Search code, provider name…"
          filters={[
            { key: "status", label: "Status" },
            { key: "country", label: "Country" },
            { key: "circuit_breaker_state", label: "Breaker" },
          ]}
        />
      ) : (
        <ResourceTable
          resource="circuit-breakers"
          columns={breakerCols}
          exportName="circuit-breakers"
          searchPlaceholder="Search service key…"
          filters={[{ key: "state", label: "State" }]}
        />
      )}
    </div>
  );
}
