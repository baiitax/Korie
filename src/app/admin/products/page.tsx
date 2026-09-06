"use client";

import React from "react";
import { PageHeader, fmtMoney, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Banking products — live banking_products catalogue. The old page's
 * product simulator ran on an in-memory /api/products engine; the portal
 * now shows the versioned product catalogue as governed in the database,
 * with audited lifecycle transitions.
 */
export default function ProductsPage() {
  const { openDrawer } = useAdmin();

  const cols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "product_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.product_code}</span> },
    { key: "name", label: "Product" },
    { key: "product_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.product_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "customer_type", label: "Segment", hideOnMobile: true },
    { key: "jurisdiction", label: "Jurisdiction" },
    { key: "currency", label: "Ccy", hideOnMobile: true },
    { key: "version", label: "Ver.", className: "text-right" },
    { key: "daily_transaction_limit", label: "Daily limit", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.daily_transaction_limit, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Banking Products"
        subtitle="Wallets, savings and transfer products with jurisdictional limits and versioning — the governed catalogue, not a simulation. Lifecycle changes are audited."
      />
      <ResourceTable
        resource="products"
        columns={cols}
        exportName="banking-products"
        searchPlaceholder="Search product code, name…"
        filters={[
          { key: "status", label: "Status" },
          { key: "jurisdiction", label: "Jurisdiction" },
          { key: "product_type", label: "Type" },
        ]}
        onRowClick={(row) => openDrawer("PRODUCT", row)}
      />
    </div>
  );
}
