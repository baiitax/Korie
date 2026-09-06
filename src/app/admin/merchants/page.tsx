"use client";

import React, { useState } from "react";
import { PageHeader, fmtDate, TextCell } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Merchants — live view of the partner registry and merchant intelligence
 * profiles. The old page rendered an invented MERCHANTS constant ("Kano
 * Central Market Electronics" etc.).
 */
export default function MerchantsAdminPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"registry" | "profiles">("registry");

  const partnerCols: ResourceColumn[] = [
    { key: "partner_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.partner_code}</span> },
    { key: "legal_entity", label: "Legal entity" },
    { key: "category", label: "Category", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.category ?? "—").replaceAll("_", " ")}</span> },
    { key: "country", label: "Country" },
    { key: "tier", label: "Tier", hideOnMobile: true },
    { key: "kyb_status", label: "KYB", render: (r) => <StatusChip value={r.kyb_status} /> },
    { key: "lifecycle_status", label: "Lifecycle", render: (r) => <StatusChip value={r.lifecycle_status} /> },
    { key: "created_at", label: "Onboarded", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
  ];

  const profileCols: ResourceColumn[] = [
    { key: "business_name", label: "Merchant", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.business_name}</span> },
    { key: "monthly_gmv_ngn", label: "Monthly GMV", className: "text-right", render: (r) => <span className="font-bold">{fmtNGN(r.monthly_gmv_ngn)}</span> },
    { key: "processing_margin_pct", label: "Margin", className: "text-right", render: (r) => <span>{r.processing_margin_pct ?? "—"}%</span> },
    { key: "dispute_ratio_pct", label: "Disputes", className: "text-right", render: (r) => <span className={Number(r.dispute_ratio_pct) > 1 ? "text-rose-400" : "text-emerald-400"}>{r.dispute_ratio_pct ?? "—"}%</span> },
    { key: "growth_trend_pct", label: "Growth", hideOnMobile: true, className: "text-right", render: (r) => <span className={Number(r.growth_trend_pct) >= 0 ? "text-emerald-400" : "text-rose-400"}>{r.growth_trend_pct ?? "—"}%</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
    { key: "updated_at", label: "Updated", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.updated_at)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Agency & Merchants"
        title="Merchant Network"
        subtitle="Partner registry with KYB standing, plus merchant intelligence profiles (GMV, margins, dispute ratios) as computed by the analytics pipeline."
      />

      <div className="flex gap-2 text-xs font-bold">
        {(["registry", "profiles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "registry" ? "Partner registry" : "Intelligence profiles"}
          </button>
        ))}
      </div>

      {tab === "registry" ? (
        <ResourceTable
          resource="partners"
          columns={partnerCols}
          exportName="partners"
          searchPlaceholder="Search partner code, legal entity…"
          filters={[
            { key: "lifecycle_status", label: "Lifecycle" },
            { key: "category", label: "Category" },
            { key: "country", label: "Country" },
          ]}
          onRowClick={(row) => openDrawer("MERCHANT", row)}
        />
      ) : (
        <ResourceTable
          resource="merchant-profiles"
          columns={profileCols}
          exportName="merchant-profiles"
          searchPlaceholder="Search business name…"
          filters={[{ key: "status", label: "Status" }]}
        />
      )}
    </div>
  );
}

function fmtNGN(v: unknown): string {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return `₦${n.toLocaleString()}`;
}
