"use client";

import React from "react";
import { PageHeader, fmtDate, TextCell } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Support center — live view of support_tickets, escalations and officers.
 * The old page shipped invented tickets ("TCK-8812 POS Terminal Paper
 * Roll…"); every ticket below was actually raised by a customer.
 */
export default function SupportAdminPage() {
  const ticketCols: ResourceColumn[] = [
    { key: "created_at", label: "Raised", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "ticket_number", label: "Ticket", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.ticket_number}</span> },
    { key: "subject", label: "Subject" },
    { key: "customer_name", label: "Customer", hideOnMobile: true, render: (r) => <TextCell value={r.customer_name} /> },
    { key: "priority", label: "Priority", render: (r) => <StatusChip value={r.priority as string} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
    { key: "jurisdiction", label: "Market", hideOnMobile: true },
  ];

  const escalationCols: ResourceColumn[] = [
    { key: "created_at", label: "Raised", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "escalation_number", label: "Escalation", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.escalation_number}</span> },
    { key: "reason", label: "Reason" },
    { key: "priority", label: "Priority", render: (r) => <StatusChip value={r.priority as string} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
    { key: "sla_due_at", label: "SLA due", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.sla_due_at)}</span> },
  ];

  const officerCols: ResourceColumn[] = [
    { key: "full_name", label: "Officer", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.full_name}</span> },
    { key: "officer_code", label: "Code" },
    { key: "tier", label: "Tier" },
    { key: "jurisdiction", label: "Market", hideOnMobile: true },
    { key: "languages", label: "Languages", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{Array.isArray(r.languages) ? r.languages.join(", ") : (r.languages ?? "—")}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Support"
        title="Customer Support Command"
        subtitle="Tickets, escalations and officer staffing from the support platform tables — SLA clocks and priorities exactly as the system recorded them."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Tickets</h2>
        <ResourceTable
          resource="support-tickets"
          columns={ticketCols}
          exportName="support-tickets"
          searchPlaceholder="Search ticket number, subject, customer…"
          filters={[
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
            { key: "jurisdiction", label: "Market" },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Escalations</h2>
        <ResourceTable
          resource="support-escalations"
          columns={escalationCols}
          exportName="support-escalations"
          searchPlaceholder="Search escalation number…"
          filters={[{ key: "status", label: "Status" }]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Officers</h2>
        <ResourceTable
          resource="support-officers"
          columns={officerCols}
          exportName="support-officers"
          searchPlaceholder="Search officer code, name…"
          filters={[{ key: "status", label: "Status" }, { key: "tier", label: "Tier" }]}
        />
      </section>
    </div>
  );
}
