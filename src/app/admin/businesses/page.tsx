"use client";

import React from "react";
import { PageHeader, fmtDate, TextCell } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Business customers — live view of identity_organizations (KYB registry).
 * The old page's "Sahel Logistics & Freight Corp" rows were invented; real
 * businesses appear only when they have actually registered.
 */
export default function BusinessesPage() {
  const columns: ResourceColumn[] = [
    { key: "trading_name", label: "Business", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.trading_name}</span> },
    { key: "identity_reference", label: "Reference", hideOnMobile: true, render: (r) => <TextCell value={r.identity_reference} /> },
    { key: "business_type", label: "Type" },
    { key: "industry", label: "Industry", hideOnMobile: true },
    { key: "country_code", label: "Country" },
    { key: "kyb_status", label: "KYB", render: (r) => <StatusChip value={r.kyb_status as string} /> },
    { key: "risk_level", label: "Risk", hideOnMobile: true, render: (r) => <StatusChip value={r.risk_level as string} /> },
    { key: "created_at", label: "Registered", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Customers"
        title="Business & Corporate Customers"
        subtitle="Verified organizational identities from the KYB registry — trading names, industries and verification standing as recorded by onboarding."
      />
      <ResourceTable
        resource="identity-organizations"
        columns={columns}
        exportName="businesses"
        searchPlaceholder="Search trading name, registration number…"
        filters={[
          { key: "kyb_status", label: "KYB" },
          { key: "business_type", label: "Type" },
          { key: "country", label: "Country" },
        ]}
      />
    </div>
  );
}
