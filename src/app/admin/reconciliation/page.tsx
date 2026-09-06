"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Reconciliation — live exceptions, runs, suspense items and imported bank
 * statements. The old 656-line page ran sessions and orphan detection
 * against the in-memory engine; the portal now shows the database of
 * record, and exception resolution is an audited status flip.
 */
export default function ReconciliationPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"exceptions" | "runs" | "suspense" | "statements">("exceptions");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const exceptionCols: ResourceColumn[] = [
    { key: "created_at", label: "Detected", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "provider_reference", label: "Provider ref", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.provider_reference ?? "—"}</span> },
    { key: "discrepancy_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">{String(r.discrepancy_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "internal_amount", label: "Internal", className: "text-right", render: (r) => <span>{fmtMoney(r.internal_amount, r.currency)}</span> },
    { key: "provider_amount", label: "Provider", className: "text-right", render: (r) => <span>{fmtMoney(r.provider_amount, r.currency)}</span> },
    { key: "variance", label: "Variance", className: "text-right", render: (r) => <span className={Number(r.variance) !== 0 ? "text-rose-400 font-bold" : ""}>{fmtMoney(r.variance, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const runCols: ResourceColumn[] = [
    { key: "created_at", label: "Ran", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "run_date", label: "Run date" },
    { key: "provider_code", label: "Provider", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.provider_code}</span> },
    { key: "matched_count", label: "Matched", className: "text-right", render: (r) => <span className="text-emerald-400">{r.matched_count ?? "—"}</span> },
    { key: "unmatched_count", label: "Unmatched", className: "text-right", render: (r) => <span className={Number(r.unmatched_count) > 0 ? "text-amber-400 font-bold" : ""}>{r.unmatched_count ?? "—"}</span> },
    { key: "discrepancy_amount", label: "Discrepancy", className: "text-right" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const suspenseCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "suspense_account_code", label: "Suspense account", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.suspense_account_code}</span> },
    { key: "source_reference", label: "Source ref", hideOnMobile: true },
    { key: "provider_code", label: "Provider", hideOnMobile: true },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "age_days", label: "Age", className: "text-right", render: (r) => <span className={Number(r.age_days) > 7 ? "text-rose-400 font-bold" : "text-[var(--foreground-muted)]"}>{r.age_days ?? "—"}d</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const statementCols: ResourceColumn[] = [
    { key: "imported_at", label: "Imported", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.imported_at)}</span> },
    { key: "statement_reference", label: "Statement", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.statement_reference}</span> },
    { key: "statement_date", label: "Period" },
    { key: "currency", label: "Ccy" },
    { key: "line_count", label: "Lines", className: "text-right" },
    { key: "is_integrity_verified", label: "Integrity", render: (r) => <span className={r.is_integrity_verified ? "text-emerald-400" : "text-amber-400"}>{r.is_integrity_verified ? "VERIFIED" : "UNVERIFIED"}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Reconciliation & Exception Management"
        subtitle="Provider reconciliation exceptions, run history, suspense ledger and imported bank statements — the database of record, not an engine simulation."
      />

      {tab === "exceptions" && (
        <StatsFromRows
          rows={rows}
          contextLabel="reconciliation_exceptions (current filter)"
          stats={[
            { label: "Loaded exceptions", compute: (r) => String(r.length) },
            { label: "Open", compute: (r) => String(r.filter((x) => x.status === "OPEN").length) },
            { label: "NGN variance", compute: (r) => fmtMoney(r.filter((x) => x.currency === "NGN").reduce((s, x) => s + Number(x.variance ?? 0), 0), "NGN") },
            { label: "XOF variance", compute: (r) => fmtMoney(r.filter((x) => x.currency === "XOF").reduce((s, x) => s + Number(x.variance ?? 0), 0), "XOF") },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {(["exceptions", "runs", "suspense", "statements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "exceptions" ? "Exceptions" : t === "runs" ? "Runs" : t === "suspense" ? "Suspense ledger" : "Bank statements"}
          </button>
        ))}
      </div>

      {tab === "exceptions" && (
        <ResourceTable
          resource="reconciliation-exceptions"
          columns={exceptionCols}
          exportName="reconciliation-exceptions"
          searchPlaceholder="Search provider reference, type…"
          filters={[
            { key: "status", label: "Status" },
            { key: "currency", label: "Ccy" },
          ]}
          onRowClick={(row) => openDrawer("RECONCILIATION", row)}
          onRowsLoaded={setRows}
        />
      )}
      {tab === "runs" && (
        <ResourceTable
          resource="reconciliation-runs"
          columns={runCols}
          exportName="reconciliation-runs"
          searchPlaceholder="Search provider…"
          filters={[{ key: "status", label: "Status" }]}
        />
      )}
      {tab === "suspense" && (
        <ResourceTable
          resource="suspense-items"
          columns={suspenseCols}
          exportName="suspense-items"
          searchPlaceholder="Search source reference…"
          filters={[
            { key: "status", label: "Status" },
            { key: "currency", label: "Ccy" },
          ]}
          onRowClick={(row) => openDrawer("SUSPENSE", row)}
        />
      )}
      {tab === "statements" && (
        <ResourceTable
          resource="bank-statements"
          columns={statementCols}
          exportName="bank-statements"
          searchPlaceholder="Search statement reference…"
        />
      )}
    </div>
  );
}
