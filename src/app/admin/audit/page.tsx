"use client";

import React from "react";
import { PageHeader, fmtDate, TextCell } from "@/components/admin/AdminPageUI";
import ResourceTable, { ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Security & audit trail — live view of public.audit_events (every admin
 * PATCH through the portal writes here too). The old page listed invented
 * entries ("aud-0981"); these rows are whatever the platform actually
 * recorded.
 */
export default function AuditPage() {
  const columns: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "actor_email", label: "Actor", render: (r) => <TextCell value={r.actor_email} /> },
    { key: "actor_role", label: "Role", render: (r) => <span className="text-[var(--brand-primary)] font-bold">{r.actor_role ?? "—"}</span> },
    { key: "action", label: "Action", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.action}</span> },
    { key: "resource_type", label: "Resource", render: (r) => <TextCell value={r.resource_type} /> },
    { key: "resource_id", label: "Record", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.resource_id ? String(r.resource_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "ip_address", label: "IP", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.ip_address ?? "—"}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Security & Audit"
        title="Immutable Audit Trail"
        subtitle="Every privileged action recorded by the platform — admin mutations, maker-checker approvals, KYC decisions — streamed from audit_events."
      />
      <ResourceTable
        resource="audit-events"
        columns={columns}
        exportName="audit-events"
        searchPlaceholder="Search actor, action, resource…"
        filters={[
          { key: "action", label: "Action" },
          { key: "actor_role", label: "Role" },
          { key: "resource_type", label: "Resource" },
        ]}
        limit={100}
      />
    </div>
  );
}
