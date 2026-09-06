"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Cash & vault operations — live tills, movements, counts, variances,
 * vaults and CIT shipments. The old 1344-line page drove an in-memory cash
 * engine; every figure now comes from the cash operations tables.
 */
export default function CashOperationsPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"tills" | "movements" | "counts" | "variances" | "vaults" | "cit">("tills");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const tillCols: ResourceColumn[] = [
    { key: "till_code", label: "Till", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.till_code}</span> },
    { key: "assigned_operator", label: "Operator" },
    { key: "currency", label: "Ccy" },
    { key: "current_expected_balance", label: "Expected", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.current_expected_balance, r.currency)}</span> },
    { key: "max_holding_limit", label: "Max holding", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.max_holding_limit, r.currency)}</span> },
    { key: "last_opened_at", label: "Last opened", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.last_opened_at ? fmtDate(r.last_opened_at) : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const movementCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "movement_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.movement_reference}</span> },
    { key: "movement_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.movement_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "initiated_by", label: "Initiated by", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const countCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "count_type", label: "Type" },
    { key: "currency", label: "Ccy" },
    { key: "expected_amount", label: "Expected", className: "text-right", render: (r) => <span>{fmtMoney(r.expected_amount, r.currency)}</span> },
    { key: "counted_amount", label: "Counted", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.counted_amount, r.currency)}</span> },
    { key: "variance_amount", label: "Variance", className: "text-right", render: (r) => <span className={Number(r.variance_amount) !== 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>{fmtMoney(r.variance_amount, r.currency)}</span> },
    { key: "counted_by", label: "Counted by", hideOnMobile: true },
    { key: "count_status", label: "Status", render: (r) => <StatusChip value={r.count_status} /> },
  ];

  const varianceCols: ResourceColumn[] = [
    { key: "created_at", label: "Detected", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "variance_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.variance_reference}</span> },
    { key: "variance_type", label: "Type" },
    { key: "variance_amount", label: "Variance", className: "text-right", render: (r) => <span className={Number(r.variance_amount) < 0 ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>{fmtMoney(r.variance_amount, r.currency)}</span> },
    { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
    { key: "investigated_by", label: "Investigator", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const vaultCols: ResourceColumn[] = [
    { key: "vault_code", label: "Vault", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.vault_code}</span> },
    { key: "country", label: "Country" },
    { key: "currency", label: "Ccy" },
    { key: "current_cash_holding", label: "Holding", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.current_cash_holding, r.currency)}</span> },
    { key: "max_vault_capacity", label: "Capacity", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.max_vault_capacity, r.currency)}</span> },
    { key: "custodian_a", label: "Custodian A", hideOnMobile: true },
    { key: "dual_control_required", label: "Dual control", hideOnMobile: true, render: (r) => <span>{r.dual_control_required ? "Yes" : "No"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const citCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "shipment_code", label: "Shipment", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.shipment_code}</span> },
    { key: "cit_provider", label: "CIT provider", hideOnMobile: true },
    { key: "declared_amount", label: "Declared", className: "text-right", render: (r) => <span>{fmtMoney(r.declared_amount, r.currency)}</span> },
    { key: "counted_received_amount", label: "Received", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.counted_received_amount, r.currency)}</span> },
    { key: "variance_amount", label: "Variance", className: "text-right", render: (r) => <span className={Number(r.variance_amount) !== 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>{fmtMoney(r.variance_amount, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const tabs = [
    ["tills", "Tills"],
    ["movements", "Movements"],
    ["counts", "Counts"],
    ["variances", "Variances"],
    ["vaults", "Vaults"],
    ["cit", "CIT shipments"],
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Operations"
        title="Cash & Vault Operations"
        subtitle="Till positions, cash movements, counts and variances, vault custody and CIT shipments — the physical cash ledger as recorded, with audited variance investigation."
      />

      {tab === "variances" && (
        <StatsFromRows
          rows={rows}
          contextLabel="cash_variances (current filter)"
          stats={[
            { label: "Loaded variances", compute: (r) => String(r.length) },
            { label: "Open", compute: (r) => String(r.filter((x) => x.status === "OPEN").length) },
            { label: "High/Critical", compute: (r) => String(r.filter((x) => x.severity === "HIGH" || x.severity === "CRITICAL").length) },
            { label: "Total variance", compute: (r) => fmtMoney(r.reduce((s, x) => s + Number(x.variance_amount ?? 0), 0), r[0]?.currency ?? "NGN") },
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

      {tab === "tills" && <ResourceTable resource="tills" columns={tillCols} exportName="tills" searchPlaceholder="Search till code, operator…" filters={[{ key: "status", label: "Status" }]} />}
      {tab === "movements" && <ResourceTable resource="cash-movements" columns={movementCols} exportName="cash-movements" searchPlaceholder="Search movement reference…" filters={[{ key: "status", label: "Status" }, { key: "movement_type", label: "Type" }]} />}
      {tab === "counts" && <ResourceTable resource="cash-counts" columns={countCols} exportName="cash-counts" filters={[{ key: "count_status", label: "Status" }]} />}
      {tab === "variances" && <ResourceTable resource="cash-variances" columns={varianceCols} exportName="cash-variances" searchPlaceholder="Search variance reference…" filters={[{ key: "status", label: "Status" }, { key: "severity", label: "Severity" }]} onRowClick={(row) => openDrawer("VARIANCE", row)} onRowsLoaded={setRows} />}
      {tab === "vaults" && <ResourceTable resource="vaults" columns={vaultCols} exportName="vaults" searchPlaceholder="Search vault code…" filters={[{ key: "status", label: "Status" }]} />}
      {tab === "cit" && <ResourceTable resource="cit-shipments" columns={citCols} exportName="cit-shipments" searchPlaceholder="Search shipment code, provider…" filters={[{ key: "status", label: "Status" }]} onRowClick={(row) => openDrawer("CIT_SHIPMENT", row)} />}
    </div>
  );
}
