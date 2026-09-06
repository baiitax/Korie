"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * BDC / FX operations — live views of the partner registry (BDC category),
 * executed FX transactions and current rates. The old page shipped an
 * invented BDC_OPERATORS constant; operator standing now comes from the
 * partner registry and activity from the liquidity ledger.
 */
export default function BdcAdminPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"operators" | "activity">("operators");

  const operatorCols: ResourceColumn[] = [
    { key: "partner_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.partner_code}</span> },
    { key: "legal_entity", label: "Operator" },
    { key: "category", label: "Category", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.category ?? "—").replaceAll("_", " ")}</span> },
    { key: "country", label: "Country" },
    { key: "kyb_status", label: "KYB", render: (r) => <StatusChip value={r.kyb_status} /> },
    { key: "lifecycle_status", label: "Status", render: (r) => <StatusChip value={r.lifecycle_status} /> },
  ];

  const fxCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "fx_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.fx_reference}</span> },
    { key: "source_currency", label: "Leg", render: (r) => <span>{fmtMoney(r.source_amount, r.source_currency)} → {fmtMoney(r.target_amount, r.target_currency)}</span> },
    { key: "exchange_rate", label: "Rate", className: "text-right", render: (r) => <span className="font-bold text-[var(--brand-primary)]">{typeof r.exchange_rate === "number" ? r.exchange_rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span> },
    { key: "approved_by", label: "Approved by", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Agency & Merchants"
        title="Bureau de Change & FX Operations"
        subtitle="BDC operators from the partner registry and executed FX conversions from the liquidity engine — the NGN⇄XOF corridor as actually recorded."
      />

      <div className="flex gap-2 text-xs font-bold">
        {(["operators", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "operators" ? "Operators (partner registry)" : "FX activity"}
          </button>
        ))}
      </div>

      {tab === "operators" ? (
        <ResourceTable
          resource="partners"
          columns={operatorCols}
          exportName="bdc-operators"
          searchPlaceholder="Search partner code, legal entity…"
          filters={[
            { key: "category", label: "Category" },
            { key: "country", label: "Country" },
            { key: "kyb_status", label: "KYB" },
          ]}
          onRowClick={(row) => openDrawer("BDC", row)}
        />
      ) : (
        <ResourceTable
          resource="fx-transactions"
          columns={fxCols}
          exportName="fx-activity"
          searchPlaceholder="Search FX reference…"
          filters={[
            { key: "status", label: "Status" },
            { key: "source_currency", label: "Source" },
          ]}
        />
      )}
    </div>
  );
}
