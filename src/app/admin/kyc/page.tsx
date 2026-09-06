"use client";

import React, { useState } from "react";
import { PageHeader, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * KYC review queue — live customer_kyc_documents and agent_kyc_documents.
 * The old page called /api/core/v1/identity/verify (in-memory engine);
 * review decisions now write through the audited registry PATCH and appear
 * in the audit trail.
 */
export default function KycPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"customer" | "agent">("customer");

  const customerCols: ResourceColumn[] = [
    { key: "uploaded_at", label: "Uploaded", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.uploaded_at)}</span> },
    { key: "customer_id", label: "Customer", render: (r) => <span className="font-mono">{r.customer_id ? String(r.customer_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "document_type", label: "Document", render: (r) => <span className="font-bold text-[var(--foreground)]">{String(r.document_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "original_filename", label: "File", hideOnMobile: true },
    { key: "reviewed_by", label: "Reviewer", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.reviewed_by ?? "—"}</span> },
    { key: "rejection_reason", label: "Rejection reason", hideOnMobile: true, render: (r) => <span className="text-rose-400">{r.rejection_reason ?? "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const agentCols: ResourceColumn[] = [
    { key: "uploaded_at", label: "Uploaded", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.uploaded_at)}</span> },
    { key: "agent_id", label: "Agent", render: (r) => <span className="font-mono">{r.agent_id ? String(r.agent_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "document_type", label: "Document", render: (r) => <span className="font-bold text-[var(--foreground)]">{String(r.document_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "original_filename", label: "File", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Customers"
        title="KYC & Identity Review"
        subtitle="Identity documents awaiting review or already decided. Approve/reject actions run through the audited PATCH endpoint and are recorded in audit_events."
      />

      <div className="flex gap-2 text-xs font-bold">
        {(["customer", "agent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "customer" ? "Customer documents" : "Agent documents"}
          </button>
        ))}
      </div>

      {tab === "customer" ? (
        <ResourceTable
          resource="kyc-documents"
          columns={customerCols}
          exportName="customer-kyc"
          searchPlaceholder="Search filename, document type…"
          filters={[{ key: "status", label: "Status" }]}
          onRowClick={(row) => openDrawer("KYC_DOCUMENT", row)}
        />
      ) : (
        <ResourceTable
          resource="agent-kyc-documents"
          columns={agentCols}
          exportName="agent-kyc"
          searchPlaceholder="Search filename, document type…"
          filters={[{ key: "status", label: "Status" }]}
          onRowClick={(row) => openDrawer("AGENT_KYC_DOCUMENT", row)}
        />
      )}
    </div>
  );
}
