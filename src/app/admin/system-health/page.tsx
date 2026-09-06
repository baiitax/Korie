"use client";

import React, { useState } from "react";
import { PageHeader, fmtAgo, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * System health — live operational incident records, circuit breakers,
 * outbox events and the dead-letter queue. The old page polled in-memory
 * resilience endpoints; these are the persistence layer's actual records.
 * (Engine-side replay of dead-letter jobs is not wired into the portal.)
 */
export default function SystemHealthPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"incidents" | "breakers" | "outbox" | "dlq">("incidents");

  const incidentCols: ResourceColumn[] = [
    { key: "detected_at", label: "Detected", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.detected_at)}</span> },
    { key: "incident_reference", label: "Incident", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.incident_reference}</span> },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
    { key: "incident_commander", label: "Commander", hideOnMobile: true },
    { key: "root_cause", label: "Root cause", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
    { key: "resolved_at", label: "Resolved", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.resolved_at ? fmtDate(r.resolved_at) : "—"}</span> },
  ];

  const breakerCols: ResourceColumn[] = [
    { key: "service_key", label: "Service", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.service_key}</span> },
    { key: "tier", label: "Tier" },
    { key: "state", label: "State", render: (r) => <StatusChip value={r.state} /> },
    { key: "failure_count", label: "Failures", className: "text-right", render: (r) => <span className={Number(r.failure_count) > 0 ? "text-amber-400" : ""}>{r.failure_count ?? 0}</span> },
    { key: "trip_reason", label: "Trip reason", hideOnMobile: true },
    { key: "updated_at", label: "Updated", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.updated_at)}</span> },
  ];

  const outboxCols: ResourceColumn[] = [
    { key: "created_at", label: "Queued", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.created_at)}</span> },
    { key: "event_name", label: "Event", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.event_name}</span> },
    { key: "aggregate_type", label: "Aggregate", hideOnMobile: true },
    { key: "retry_count", label: "Retries", className: "text-right", render: (r) => <span>{r.retry_count ?? 0}/{r.max_retries ?? "—"}</span> },
    { key: "last_error", label: "Last error", hideOnMobile: true, render: (r) => <span className="text-rose-400">{r.last_error ?? "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const dlqCols: ResourceColumn[] = [
    { key: "created_at", label: "Dead-lettered", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "job_key", label: "Job", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.job_key}</span> },
    { key: "queue_name", label: "Queue" },
    { key: "error_message", label: "Error", hideOnMobile: true, render: (r) => <span className="text-rose-400">{r.error_message ?? "—"}</span> },
    { key: "retry_count", label: "Retries", className: "text-right", render: (r) => <span>{r.retry_count ?? 0}/{r.max_retries ?? "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const tabs = [
    ["incidents", "Incidents"],
    ["breakers", "Circuit breakers"],
    ["outbox", "Outbox events"],
    ["dlq", "Dead-letter queue"],
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Banking Nodes"
        title="System Health & Resilience"
        subtitle="Operational incidents, circuit breaker states, transactional outbox and dead-letter jobs — the resilience records the platform actually persisted."
      />

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "incidents" && (
        <ResourceTable resource="incidents" columns={incidentCols} exportName="incidents" searchPlaceholder="Search incident reference…" filters={[{ key: "status", label: "Status" }, { key: "severity", label: "Severity" }]} onRowClick={(row) => openDrawer("INCIDENT", row)} />
      )}
      {tab === "breakers" && (
        <ResourceTable resource="circuit-breakers" columns={breakerCols} exportName="circuit-breakers" searchPlaceholder="Search service key…" filters={[{ key: "state", label: "State" }]} />
      )}
      {tab === "outbox" && (
        <ResourceTable resource="outbox-events" columns={outboxCols} exportName="outbox-events" filters={[{ key: "status", label: "Status" }]} />
      )}
      {tab === "dlq" && (
        <ResourceTable resource="dead-letter-jobs" columns={dlqCols} exportName="dead-letter-jobs" searchPlaceholder="Search job key, queue…" filters={[{ key: "status", label: "Status" }]} />
      )}
    </div>
  );
}
