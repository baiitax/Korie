"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, TextCell, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Agent network — live agents, onboarding applications and terminals. The
 * old 1300-line page drove every number from the in-memory /api/agents
 * engine; agents, applications and their KYB/KYC state now come from the
 * database, with audited approve/reject on applications.
 */
export default function AgentsPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"network" | "applications" | "terminals">("network");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const agentCols: ResourceColumn[] = [
    { key: "created_at", label: "Onboarded", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "agent_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.agent_code}</span> },
    { key: "trading_name", label: "Trading name" },
    { key: "country", label: "Country" },
    { key: "tier", label: "Tier" },
    { key: "quality_score", label: "Quality", className: "text-right", render: (r) => <span className={Number(r.quality_score) < 0.8 ? "text-amber-400" : "text-emerald-400"}>{r.quality_score ?? "—"}</span> },
    { key: "risk_tier", label: "Risk", hideOnMobile: true, render: (r) => <StatusChip value={r.risk_tier} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const applicationCols: ResourceColumn[] = [
    { key: "submitted_at", label: "Submitted", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.submitted_at)}</span> },
    { key: "applicant_full_name", label: "Applicant", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.applicant_full_name}</span> },
    { key: "business_name", label: "Business", hideOnMobile: true },
    { key: "country", label: "Country" },
    { key: "requested_tier", label: "Tier" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const terminalCols: ResourceColumn[] = [
    { key: "terminal_id", label: "Terminal", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.terminal_id}</span> },
    { key: "terminal_type", label: "Type" },
    { key: "agent_id", label: "Agent", hideOnMobile: true, render: (r) => <span className="font-mono text-[var(--foreground-muted)]">{r.agent_id ? String(r.agent_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "capabilities", label: "Capabilities", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{Array.isArray(r.capabilities) ? r.capabilities.join(", ") : "—"}</span> },
    { key: "last_heartbeat_at", label: "Heartbeat", render: (r) => <span className="text-[var(--foreground-muted)]">{r.last_heartbeat_at ? fmtDate(r.last_heartbeat_at) : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Agency & Merchants"
        title="Agent Banking Network"
        subtitle="Agents, onboarding applications and POS terminals from the agency tables — tier policies, quality scores and commissions as recorded."
      />

      {tab === "network" && (
        <StatsFromRows
          rows={rows}
          contextLabel="agents (current filter)"
          stats={[
            { label: "Loaded agents", compute: (r) => String(r.length) },
            { label: "Nigeria", compute: (r) => String(r.filter((x) => x.country === "NG").length) },
            { label: "Niger", compute: (r) => String(r.filter((x) => x.country === "NE").length) },
            { label: "Suspended/frozen", compute: (r) => String(r.filter((x) => x.status === "SUSPENDED" || x.status === "FROZEN").length) },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {(["network", "applications", "terminals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors capitalize ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "network" ? "Agent network" : t}
          </button>
        ))}
      </div>

      {tab === "network" && (
        <ResourceTable
          resource="agents"
          columns={agentCols}
          exportName="agents"
          searchPlaceholder="Search code, trading name, email, phone…"
          filters={[
            { key: "status", label: "Status" },
            { key: "country", label: "Country" },
            { key: "tier", label: "Tier" },
          ]}
          onRowClick={(row) => openDrawer("AGENT", row)}
          onRowsLoaded={setRows}
        />
      )}

      {tab === "applications" && (
        <ResourceTable
          resource="agent-applications"
          columns={applicationCols}
          exportName="agent-applications"
          searchPlaceholder="Search applicant, business, email…"
          filters={[
            { key: "status", label: "Status" },
            { key: "country", label: "Country" },
          ]}
          onRowClick={(row) => openDrawer("AGENT_APPLICATION", row)}
        />
      )}

      {tab === "terminals" && (
        <ResourceTable
          resource="agency-terminals"
          columns={terminalCols}
          exportName="agency-terminals"
          searchPlaceholder="Search terminal id…"
          filters={[{ key: "status", label: "Status" }]}
        />
      )}
    </div>
  );
}
