"use client";

import React, { useState } from "react";
import { PageHeader, fmtAgo, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * API management — live api clients, credentials, gateway routes and threat
 * events. The old page issued/rotated keys against an in-memory
 * credentials engine; clients and credential state now come from the
 * database with audited revoke/reactivate actions.
 */
export default function ApisPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"clients" | "credentials" | "routes" | "threats">("clients");

  const clientCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "client_id", label: "Client ID", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.client_id}</span> },
    { key: "client_name", label: "Name" },
    { key: "environment", label: "Env" },
    { key: "allowed_scopes", label: "Scopes", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{Array.isArray(r.allowed_scopes) ? r.allowed_scopes.join(", ") : "—"}</span> },
    { key: "rate_limit_per_second", label: "Rate limit", className: "text-right", render: (r) => <span>{r.rate_limit_per_second ?? "—"}/s</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const credentialCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "key_prefix", label: "Key", render: (r) => <span className="font-mono font-bold text-[var(--foreground)]">{r.key_prefix ?? "—"}…</span> },
    { key: "client_id", label: "Client" },
    { key: "client_name", label: "Name", hideOnMobile: true },
    { key: "environment", label: "Env" },
    { key: "last_used_at", label: "Last used", render: (r) => <span className="text-[var(--foreground-muted)]">{r.last_used_at ? fmtAgo(r.last_used_at) : "never"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const routeCols: ResourceColumn[] = [
    { key: "route_code", label: "Route", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.route_code}</span> },
    { key: "group_name", label: "Group" },
    { key: "http_method", label: "Method", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{r.http_method}</span> },
    { key: "version", label: "Ver.", className: "text-right" },
    { key: "required_scope", label: "Scope", hideOnMobile: true },
    { key: "rate_limit_per_second", label: "Rate limit", className: "text-right", render: (r) => <span>{r.rate_limit_per_second ?? "—"}/s</span> },
    { key: "is_active", label: "State", render: (r) => <StatusChip value={r.is_active ? "ACTIVE" : "INACTIVE"} /> },
  ];

  const threatCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.created_at)}</span> },
    { key: "threat_type", label: "Threat", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">{String(r.threat_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "client_id", label: "Client" },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
  ];

  const tabs = [
    ["clients", "API clients"],
    ["credentials", "Credentials"],
    ["routes", "Gateway routes"],
    ["threats", "Threat events"],
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Banking Nodes"
        title="API Management"
        subtitle="Developer API clients, credential lifecycle (prefixes only — secrets are hashed), gateway routes and threat detection events, live from the platform tables."
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

      {tab === "clients" && (
        <ResourceTable resource="api-clients" columns={clientCols} exportName="api-clients" searchPlaceholder="Search client ID, name…" filters={[{ key: "status", label: "Status" }, { key: "environment", label: "Env" }]} onRowClick={(row) => openDrawer("API_CLIENT", row)} />
      )}
      {tab === "credentials" && (
        <ResourceTable resource="api-credentials" columns={credentialCols} exportName="api-credentials" searchPlaceholder="Search client, key prefix…" filters={[{ key: "status", label: "Status" }, { key: "environment", label: "Env" }]} onRowClick={(row) => openDrawer("API_CREDENTIAL", row)} />
      )}
      {tab === "routes" && (
        <ResourceTable resource="api-routes" columns={routeCols} exportName="api-gateway-routes" searchPlaceholder="Search route code, group…" filters={[{ key: "http_method", label: "Method" }]} limit={200} />
      )}
      {tab === "threats" && (
        <ResourceTable resource="api-threats" columns={threatCols} exportName="api-threats" searchPlaceholder="Search threat type, client…" filters={[{ key: "severity", label: "Severity" }]} />
      )}
    </div>
  );
}
