"use client";

import React, { useState } from "react";
import { PageHeader, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Compliance — live regulatory reports, obligations and AML cases. The old
 * page's submit/approve buttons hit an in-memory engine and changed
 * nothing; report workflow states now move through audited PATCHes.
 */
export default function CompliancePage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"reports" | "obligations" | "aml">("reports");

  const reportCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "report_reference", label: "Report", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.report_reference}</span> },
    { key: "reporting_period", label: "Period" },
    { key: "version", label: "Ver.", hideOnMobile: true },
    { key: "preparer_email", label: "Preparer", hideOnMobile: true },
    { key: "approver_email", label: "Approver", hideOnMobile: true },
    { key: "submitted_at", label: "Submitted", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.submitted_at ? fmtDate(r.submitted_at) : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const obligationCols: ResourceColumn[] = [
    { key: "obligation_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.obligation_code}</span> },
    { key: "regulator_name", label: "Regulator" },
    { key: "jurisdiction", label: "Jurisdiction" },
    { key: "frequency", label: "Frequency", hideOnMobile: true },
    { key: "responsible_department", label: "Owner", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const amlCols: ResourceColumn[] = [
    { key: "created_at", label: "Opened", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "case_reference", label: "Case", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.case_reference}</span> },
    { key: "jurisdiction", label: "Jurisdiction" },
    { key: "priority", label: "Priority", render: (r) => <StatusChip value={r.priority} /> },
    { key: "total_exposure_amount", label: "Exposure", className: "text-right", render: (r) => <span className="font-bold">{r.total_exposure_amount ?? "—"} {r.currency ?? ""}</span> },
    { key: "lead_investigator", label: "Investigator", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Risk & Compliance"
        title="Regulatory Compliance"
        subtitle="Regulatory reports (CBN, BCEAO), obligation register and AML investigation cases — live from the compliance tables."
      />

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {(["reports", "obligations", "aml"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "reports" ? "Regulatory reports" : t === "obligations" ? "Obligation register" : "AML cases"}
          </button>
        ))}
      </div>

      {tab === "reports" && (
        <ResourceTable
          resource="regulatory-reports"
          columns={reportCols}
          exportName="regulatory-reports"
          searchPlaceholder="Search report reference…"
          filters={[{ key: "status", label: "Status" }]}
          onRowClick={(row) => openDrawer("REGULATORY_REPORT", row)}
        />
      )}
      {tab === "obligations" && (
        <ResourceTable
          resource="regulatory-obligations"
          columns={obligationCols}
          exportName="regulatory-obligations"
          searchPlaceholder="Search obligation code, regulator…"
          filters={[
            { key: "status", label: "Status" },
            { key: "jurisdiction", label: "Jurisdiction" },
          ]}
        />
      )}
      {tab === "aml" && (
        <ResourceTable
          resource="aml-cases"
          columns={amlCols}
          exportName="aml-cases"
          searchPlaceholder="Search case reference…"
          filters={[
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
          ]}
          onRowClick={(row) => openDrawer("AML_CASE", row)}
        />
      )}
    </div>
  );
}
