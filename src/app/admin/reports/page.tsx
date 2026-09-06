"use client";

import React from "react";
import { PageHeader, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Reports — live regulatory reports and export records. The old page's
 * submit/approve actions hit an in-memory regulatory engine; workflow
 * states now move through audited PATCHes against the database of record.
 */
export default function ReportsPage() {
  const { openDrawer } = useAdmin();

  const reportCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "report_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.report_reference}</span> },
    { key: "reporting_period", label: "Period" },
    { key: "version", label: "Ver.", className: "text-right" },
    { key: "preparer_email", label: "Preparer", hideOnMobile: true },
    { key: "data_hash", label: "Data hash", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.data_hash ? String(r.data_hash).slice(0, 12) + "…" : "—"}</span> },
    { key: "submitted_at", label: "Submitted", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.submitted_at ? fmtDate(r.submitted_at) : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const exportCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "id", label: "Export", render: (r) => <span className="font-mono text-[var(--foreground)]">{String(r.id).slice(0, 8)}…</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Intelligence"
        title="Regulatory & Board Reporting"
        subtitle="Regulatory report workflow (draft → review → approval → submission) with data snapshots and hashes for evidence, straight from the reporting tables."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Regulatory reports</h2>
        <ResourceTable
          resource="regulatory-reports"
          columns={reportCols}
          exportName="regulatory-reports"
          searchPlaceholder="Search report reference…"
          filters={[{ key: "status", label: "Status" }]}
          onRowClick={(row) => openDrawer("REGULATORY_REPORT", row)}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Report exports</h2>
        <ResourceTable resource="report-exports" columns={exportCols} exportName="report-exports" filters={[{ key: "status", label: "Status" }]} />
      </section>
    </div>
  );
}
