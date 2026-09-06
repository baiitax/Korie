"use client";

import React from "react";
import { PageHeader, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Team & access — live view of workforce_identities and the roles table.
 * The old page invented staff ("Ibrahim Shehu — Executive Operations") with
 * fictional permission grants; this shows the real workforce registry.
 */
export default function TeamPage() {
  const peopleCols: ResourceColumn[] = [
    { key: "full_name", label: "Name", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.full_name}</span> },
    { key: "email", label: "Email" },
    { key: "employee_id", label: "Employee ID", hideOnMobile: true },
    { key: "department", label: "Department", hideOnMobile: true },
    { key: "country", label: "Country" },
    { key: "mfa_enforced", label: "MFA", render: (r) => <StatusChip value={r.mfa_enforced ? "ENFORCED" : "OFF"} /> },
    { key: "lifecycle_status", label: "Status", render: (r) => <StatusChip value={r.lifecycle_status as string} /> },
  ];

  const roleCols: ResourceColumn[] = [
    { key: "name", label: "Role", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.name}</span> },
    { key: "description", label: "Description" },
    { key: "is_system_role", label: "System", render: (r) => <span className="text-[var(--foreground-muted)]">{r.is_system_role ? "Yes" : "No"}</span> },
    { key: "created_at", label: "Created", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Security & Audit"
        title="Team, Roles & Access"
        subtitle="Workforce identities and platform roles from the database. Invite, role-change and offboarding workflows require the identity engine and are not wired into this portal build."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Workforce identities</h2>
        <ResourceTable
          resource="workforce-identities"
          columns={peopleCols}
          exportName="team"
          searchPlaceholder="Search name, email, department…"
          filters={[
            { key: "lifecycle_status", label: "Status" },
            { key: "department", label: "Department" },
            { key: "country", label: "Country" },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Platform roles</h2>
        <ResourceTable resource="roles" columns={roleCols} exportName="roles" searchPlaceholder="Search role, description…" limit={50} />
      </section>
    </div>
  );
}
