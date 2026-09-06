"use client";

import React, { useState } from "react";
import { PageHeader, fmtDate, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Risk & AML — live risk_cases, risk_rules and aml_alerts. The old page
 * read in-memory /api/v1/erm/risks; alerts and cases now stream from the
 * database with audited disposition actions.
 */
export default function RiskPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"cases" | "alerts" | "rules">("cases");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const caseCols: ResourceColumn[] = [
    { key: "created_at", label: "Opened", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "case_reference", label: "Case", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.case_reference}</span> },
    { key: "transaction_reference", label: "Transaction", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.transaction_reference ?? "—"}</span> },
    { key: "risk_score", label: "Score", className: "text-right", render: (r) => <span className="font-bold">{r.risk_score ?? "—"}</span> },
    { key: "risk_band", label: "Band", render: (r) => <StatusChip value={r.risk_band} /> },
    { key: "assigned_officer", label: "Officer", hideOnMobile: true },
    { key: "is_sla_breached", label: "SLA", render: (r) => <span className={r.is_sla_breached ? "text-rose-400 font-bold" : "text-[var(--foreground-muted)]"}>{r.is_sla_breached ? "BREACHED" : "OK"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const alertCols: ResourceColumn[] = [
    { key: "created_at", label: "Raised", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "alert_reference", label: "Alert", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.alert_reference}</span> },
    { key: "scenario_code", label: "Scenario" },
    { key: "transaction_reference", label: "Transaction", hideOnMobile: true },
    { key: "disputed_or_triggered_amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{r.disputed_or_triggered_amount ?? "—"} {r.currency ?? ""}</span> },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
    { key: "is_sla_breached", label: "SLA", hideOnMobile: true, render: (r) => <span className={r.is_sla_breached ? "text-rose-400 font-bold" : "text-[var(--foreground-muted)]"}>{r.is_sla_breached ? "BREACHED" : "OK"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const ruleCols: ResourceColumn[] = [
    { key: "rule_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.rule_code}</span> },
    { key: "rule_name", label: "Rule" },
    { key: "scope", label: "Scope", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.scope ?? "—").replaceAll("_", " ")}</span> },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
    { key: "score_delta", label: "Score Δ", className: "text-right" },
    { key: "default_action", label: "Action", hideOnMobile: true },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Risk & Compliance"
        title="Risk Cases & AML Monitoring"
        subtitle="Transaction risk cases, AML scenario alerts and the active rulebook — live from the risk tables, with audited case dispositions."
      />

      {tab === "cases" && (
        <StatsFromRows
          rows={rows}
          contextLabel="risk_cases (current filter)"
          stats={[
            { label: "Loaded cases", compute: (r) => String(r.length) },
            { label: "High/Critical", compute: (r) => String(r.filter((x) => x.risk_band === "HIGH" || x.risk_band === "CRITICAL").length) },
            { label: "SLA breached", compute: (r) => String(r.filter((x) => x.is_sla_breached).length) },
            { label: "Open", compute: (r) => String(r.filter((x) => x.status === "OPEN" || x.status === "INVESTIGATING").length) },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {(["cases", "alerts", "rules"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "cases" ? "Risk cases" : t === "alerts" ? "AML alerts" : "Rulebook"}
          </button>
        ))}
      </div>

      {tab === "cases" && (
        <ResourceTable
          resource="risk-cases"
          columns={caseCols}
          exportName="risk-cases"
          searchPlaceholder="Search case or transaction reference…"
          filters={[
            { key: "status", label: "Status" },
            { key: "risk_band", label: "Band" },
          ]}
          onRowClick={(row) => openDrawer("RISK_CASE", row)}
          onRowsLoaded={setRows}
        />
      )}
      {tab === "alerts" && (
        <ResourceTable
          resource="aml-alerts"
          columns={alertCols}
          exportName="aml-alerts"
          searchPlaceholder="Search alert or transaction reference…"
          filters={[
            { key: "status", label: "Status" },
            { key: "severity", label: "Severity" },
          ]}
          onRowClick={(row) => openDrawer("AML_ALERT", row)}
        />
      )}
      {tab === "rules" && (
        <ResourceTable
          resource="risk-rules"
          columns={ruleCols}
          exportName="risk-rules"
          searchPlaceholder="Search rule code or name…"
          filters={[
            { key: "severity", label: "Severity" },
            { key: "scope", label: "Scope" },
          ]}
        />
      )}
    </div>
  );
}
