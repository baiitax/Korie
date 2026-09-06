"use client";

import React, { useState } from "react";
import { PageHeader, fmtDate, TextCell, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Customer book — live customers and their 360 analytics profiles. The old
 * page called /api/customer/360 and /api/accounts with seeded ids; this
 * reads the real registry and shows every customer the platform actually
 * has, with audited status actions in the drawer.
 */
export default function CustomersPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"registry" | "analytics">("registry");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const customerCols: ResourceColumn[] = [
    { key: "created_at", label: "Joined", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    {
      key: "name",
      label: "Customer",
      render: (r) => (
        <span className="font-bold text-[var(--foreground)]">
          {`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—"}
        </span>
      ),
    },
    { key: "email", label: "Email", hideOnMobile: true, render: (r) => <TextCell value={r.email} /> },
    { key: "phone", label: "Phone", hideOnMobile: true, render: (r) => <TextCell value={r.phone} /> },
    { key: "country", label: "Country" },
    { key: "kyc_tier", label: "KYC", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">T{r.kyc_tier ?? "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const analyticsCols: ResourceColumn[] = [
    { key: "full_name_masked", label: "Customer", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.full_name_masked}</span> },
    { key: "jurisdiction", label: "Market" },
    { key: "rfm_segment", label: "RFM segment" },
    { key: "historical_clv_ngn", label: "Historical CLV", className: "text-right", render: (r) => <span>₦{Number(r.historical_clv_ngn ?? 0).toLocaleString()}</span> },
    { key: "churn_risk_band", label: "Churn risk", render: (r) => <StatusChip value={r.churn_risk_band} /> },
    { key: "last_active_at", label: "Last active", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.last_active_at)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Customers"
        title="Customer Registry"
        subtitle="Every customer on the platform with KYC tier and account standing. Open a customer for the full record and audited status actions."
      />

      {tab === "registry" && (
        <StatsFromRows
          rows={rows}
          contextLabel="customers (current filter)"
          stats={[
            { label: "Loaded customers", compute: (r) => String(r.length) },
            { label: "Nigeria", compute: (r) => String(r.filter((x) => x.country === "NG").length) },
            { label: "Niger", compute: (r) => String(r.filter((x) => x.country === "NE").length) },
            { label: "Not active", compute: (r) => String(r.filter((x) => x.status !== "ACTIVE").length) },
          ]}
        />
      )}

      <div className="flex gap-2 text-xs font-bold">
        {(["registry", "analytics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "registry" ? "Registry" : "360 analytics"}
          </button>
        ))}
      </div>

      {tab === "registry" ? (
        <ResourceTable
          resource="customers"
          columns={customerCols}
          exportName="customers"
          searchPlaceholder="Search name, email, phone…"
          filters={[
            { key: "status", label: "Status" },
            { key: "country", label: "Country" },
            { key: "kyc_tier", label: "KYC tier" },
          ]}
          onRowClick={(row) => openDrawer("CUSTOMER", row)}
          onRowsLoaded={setRows}
        />
      ) : (
        <ResourceTable
          resource="customer-360"
          columns={analyticsCols}
          exportName="customer-360"
          searchPlaceholder="Filter via dropdowns (masked names)"
          filters={[
            { key: "churn_risk_band", label: "Churn risk" },
            { key: "jurisdiction", label: "Market" },
          ]}
        />
      )}
    </div>
  );
}
