"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Adashi (thrift groups) — live groups, cycles, exceptions, defaults and
 * disputes from the adashi schema. The old page ran maker-checker and
 * rotation flows against an in-memory /api/v1/adashi engine; the portal
 * shows the persisted group ledger, and exception/dispute dispositions are
 * audited PATCHes.
 */
export default function AdashiPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"groups" | "cycles" | "exceptions" | "defaults" | "disputes">("groups");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const groupCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "public_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.public_reference}</span> },
    { key: "name", label: "Group" },
    { key: "country_code", label: "Market" },
    { key: "contribution_amount", label: "Contribution", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.contribution_amount, r.currency)}</span> },
    { key: "current_members_count", label: "Members", className: "text-right", render: (r) => <span>{r.current_members_count ?? 0}/{r.target_members ?? "—"}</span> },
    { key: "current_cycle_number", label: "Cycle", className: "text-right", render: (r) => <span>{r.current_cycle_number ?? "—"}/{r.total_cycles ?? "—"}</span> },
    { key: "total_pool_volume", label: "Pool volume", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.total_pool_volume, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const cycleCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "group_id", label: "Group", render: (r) => <span className="font-mono text-[var(--foreground-muted)]">{r.group_id ? String(r.group_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "cycle_number", label: "Cycle #", className: "text-right" },
    { key: "beneficiary_name", label: "Beneficiary" },
    { key: "expected_pool", label: "Expected", className: "text-right", render: (r) => <span>{fmtMoney(r.expected_pool, r.currency)}</span> },
    { key: "collected_pool", label: "Collected", className: "text-right", render: (r) => <span className={Number(r.collected_pool) < Number(r.expected_pool) ? "text-amber-400 font-bold" : "text-emerald-400"}>{fmtMoney(r.collected_pool, r.currency)}</span> },
    { key: "net_payout_amount", label: "Net payout", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.net_payout_amount, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const exceptionCols: ResourceColumn[] = [
    { key: "created_at", label: "Raised", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "exception_category", label: "Category", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">{String(r.exception_category ?? "—").replaceAll("_", " ")}</span> },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
    { key: "entity_reference", label: "Entity", hideOnMobile: true },
    { key: "error_details", label: "Details", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const defaultCols: ResourceColumn[] = [
    { key: "opened_at", label: "Opened", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.opened_at)}</span> },
    { key: "group_id", label: "Group", render: (r) => <span className="font-mono text-[var(--foreground-muted)]">{r.group_id ? String(r.group_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "customer_id", label: "Member", render: (r) => <span className="font-mono text-[var(--foreground-muted)]">{r.customer_id ? String(r.customer_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "defaulted_amount", label: "Defaulted", className: "text-right", render: (r) => <span className="text-rose-400 font-bold">{fmtMoney(r.defaulted_amount, r.currency)}</span> },
    { key: "recovered_amount", label: "Recovered", className: "text-right", render: (r) => <span className="text-emerald-400">{fmtMoney(r.recovered_amount, r.currency)}</span> },
    { key: "recovery_stage", label: "Stage", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const disputeCols: ResourceColumn[] = [
    { key: "created_at", label: "Raised", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "group_id", label: "Group", render: (r) => <span className="font-mono text-[var(--foreground-muted)]">{r.group_id ? String(r.group_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "dispute_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">{String(r.dispute_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "claim_amount", label: "Claim", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.claim_amount, r.currency ?? "NGN")}</span> },
    { key: "description", label: "Description", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const tabs = [
    ["groups", "Groups"],
    ["cycles", "Cycles"],
    ["exceptions", "Exceptions"],
    ["defaults", "Defaults"],
    ["disputes", "Disputes"],
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Customers"
        title="Adashi Thrift Groups"
        subtitle="Rotational savings groups — pools, cycles, exceptions, defaults and member disputes from the adashi schema of record."
      />

      {tab === "groups" && (
        <StatsFromRows
          rows={rows}
          contextLabel="adashi.groups (current filter)"
          stats={[
            { label: "Loaded groups", compute: (r) => String(r.length) },
            { label: "Active", compute: (r) => String(r.filter((x) => x.status === "ACTIVE").length) },
            { label: "NGN pool volume", compute: (r) => fmtMoney(r.filter((x) => x.currency === "NGN").reduce((s, x) => s + Number(x.total_pool_volume ?? 0), 0), "NGN") },
            { label: "Members", compute: (r) => String(r.reduce((s, x) => s + Number(x.current_members_count ?? 0), 0)) },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "groups" && (
        <ResourceTable resource="adashi-groups" columns={groupCols} exportName="adashi-groups" searchPlaceholder="Search reference, group name…" filters={[{ key: "status", label: "Status" }, { key: "country_code", label: "Market" }]} onRowsLoaded={setRows} />
      )}
      {tab === "cycles" && (
        <ResourceTable resource="adashi-cycles" columns={cycleCols} exportName="adashi-cycles" filters={[{ key: "status", label: "Status" }]} />
      )}
      {tab === "exceptions" && (
        <ResourceTable resource="adashi-exceptions" columns={exceptionCols} exportName="adashi-exceptions" filters={[{ key: "status", label: "Status" }, { key: "severity", label: "Severity" }]} onRowClick={(row) => openDrawer("ADASHI_EXCEPTION", row)} />
      )}
      {tab === "defaults" && (
        <ResourceTable resource="adashi-defaults" columns={defaultCols} exportName="adashi-defaults" filters={[{ key: "status", label: "Status" }]} />
      )}
      {tab === "disputes" && (
        <ResourceTable resource="adashi-disputes" columns={disputeCols} exportName="adashi-disputes" filters={[{ key: "status", label: "Status" }]} onRowClick={(row) => openDrawer("ADASHI_DISPUTE", row)} />
      )}
    </div>
  );
}
