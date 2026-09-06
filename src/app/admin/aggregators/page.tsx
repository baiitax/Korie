"use client";

import React from "react";
import { PageHeader, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Aggregator network — live view of public.aggregators. The previous build
 * shipped two hardcoded rows ("Arewa FinTech Super-Agent Consortium" etc.);
 * every number now comes from the database.
 */
export default function AggregatorsPage() {
  const columns: ResourceColumn[] = [
    { key: "aggregator_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.aggregator_code}</span> },
    { key: "business_name", label: "Business" },
    { key: "country", label: "Country" },
    { key: "legal_entity", label: "Legal entity", hideOnMobile: true },
    { key: "kyb_status", label: "KYB", render: (r) => <StatusChip value={r.kyb_status as string} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
    { key: "float_account_id", label: "Float account", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.float_account_id ? String(r.float_account_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "created_at", label: "Onboarded", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Agency Network"
        title="Super-Aggregators & Distribution Consortia"
        subtitle="Aggregator entities, KYB standing and float accounts across Nigeria and Niger Republic — read live from the platform database."
      />
      <ResourceTable
        resource="aggregators"
        columns={columns}
        exportName="aggregators"
        searchPlaceholder="Search code, business name, legal entity…"
        filters={[
          { key: "status", label: "Status" },
          { key: "country", label: "Country" },
          { key: "kyb_status", label: "KYB" },
        ]}
      />
    </div>
  );
}
