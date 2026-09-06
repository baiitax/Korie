"use client";

import React, { useState } from "react";
import { PageHeader, fmtAgo, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Security operations — live security incidents, alerts, privileged access
 * requests and IAM sessions. The old page's contain/approve/revoke buttons
 * hit in-memory engines; every action here is an audited PATCH.
 */
export default function SecurityPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"incidents" | "alerts" | "pam" | "sessions">("incidents");

  const incidentCols: ResourceColumn[] = [
    { key: "created_at", label: "Opened", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "incident_reference", label: "Incident", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.incident_reference}</span> },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
    { key: "incident_commander", label: "Commander", hideOnMobile: true },
    { key: "affected_services", label: "Affected", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{Array.isArray(r.affected_services) ? r.affected_services.join(", ") : (r.affected_services ?? "—")}</span> },
    { key: "containment_state", label: "Containment", render: (r) => <StatusChip value={r.containment_state} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const alertCols: ResourceColumn[] = [
    { key: "created_at", label: "Raised", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.created_at)}</span> },
    { key: "alert_code", label: "Alert", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.alert_code}</span> },
    { key: "target_identity", label: "Target", hideOnMobile: true },
    { key: "summary", label: "Summary" },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
    { key: "assigned_analyst", label: "Analyst", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const pamCols: ResourceColumn[] = [
    { key: "created_at", label: "Requested", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "request_reference", label: "Request", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.request_reference}</span> },
    { key: "target_role_code", label: "Role" },
    { key: "justification", label: "Justification", hideOnMobile: true },
    { key: "duration_minutes", label: "Duration", className: "text-right", render: (r) => <span>{r.duration_minutes ?? "—"}m</span> },
    { key: "lease_expires_at", label: "Lease expires", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.lease_expires_at ? fmtDate(r.lease_expires_at) : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const sessionCols: ResourceColumn[] = [
    { key: "last_activity_at", label: "Last activity", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.last_activity_at)}</span> },
    { key: "identity_id", label: "Identity", render: (r) => <span className="font-mono text-[var(--foreground)]">{r.identity_id ? String(r.identity_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "device_platform", label: "Platform", hideOnMobile: true },
    { key: "ip_address", label: "IP" },
    { key: "country_code", label: "Country", hideOnMobile: true },
    { key: "aal_level", label: "AAL", className: "text-right" },
    { key: "is_active", label: "State", render: (r) => <StatusChip value={r.is_active ? "ACTIVE" : "ENDED"} /> },
  ];

  const tabs = [
    ["incidents", "Incidents"],
    ["alerts", "Alerts"],
    ["pam", "Privileged access"],
    ["sessions", "Sessions"],
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Security & Audit"
        title="Security Operations"
        subtitle="Security incidents, detection alerts, privileged-access requests and active IAM sessions — live from the security tables with audited response actions."
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
        <ResourceTable resource="security-incidents" columns={incidentCols} exportName="security-incidents" searchPlaceholder="Search incident reference, commander…" filters={[{ key: "severity", label: "Severity" }, { key: "status", label: "Status" }]} onRowClick={(row) => openDrawer("SECURITY_INCIDENT", row)} />
      )}
      {tab === "alerts" && (
        <ResourceTable resource="security-alerts" columns={alertCols} exportName="security-alerts" searchPlaceholder="Search alert code, summary…" filters={[{ key: "severity", label: "Severity" }, { key: "status", label: "Status" }]} onRowClick={(row) => openDrawer("SECURITY_ALERT", row)} />
      )}
      {tab === "pam" && (
        <ResourceTable resource="pam-requests" columns={pamCols} exportName="pam-requests" searchPlaceholder="Search request, role, justification…" filters={[{ key: "status", label: "Status" }]} onRowClick={(row) => openDrawer("PAM_REQUEST", row)} />
      )}
      {tab === "sessions" && (
        <ResourceTable resource="iam-sessions" columns={sessionCols} exportName="iam-sessions" filters={[{ key: "is_active", label: "Active", options: ["true", "false"] }]} />
      )}
    </div>
  );
}
