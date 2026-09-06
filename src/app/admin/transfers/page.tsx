"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, TextCell, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Transfer monitoring — customer_transactions filtered to transfer types,
 * live from the database. The old page showed a filtered slice of the
 * invented TRANSACTIONS constant.
 */
export default function TransfersAdminPage() {
  const { openDrawer } = useAdmin();
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const columns: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.reference}</span> },
    { key: "transaction_type", label: "Rail", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.transaction_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "recipient_name", label: "Beneficiary", render: (r) => <TextCell value={r.recipient_name} /> },
    { key: "recipient_bank", label: "Bank", hideOnMobile: true, render: (r) => <TextCell value={r.recipient_bank} /> },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold text-[var(--foreground)]">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "destination_amount", label: "Dest. amount", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-amber-400">{r.destination_amount ? fmtMoney(r.destination_amount, r.destination_currency) : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Operations"
        title="Interbank & Cross-Border Transfers"
        subtitle="NIP and cross-border transfer legs recorded in customer_transactions — filter by rail (transaction type) to isolate a corridor."
      />

      <StatsFromRows
        rows={rows}
        contextLabel="customer_transactions (current filter)"
        stats={[
          { label: "Loaded transfers", compute: (r) => String(r.length) },
          { label: "NGN volume", compute: (r) => fmtMoney(r.filter((x) => x.currency === "NGN").reduce((s, x) => s + Number(x.amount ?? 0), 0), "NGN") },
          { label: "XOF volume", compute: (r) => fmtMoney(r.filter((x) => x.currency === "XOF").reduce((s, x) => s + Number(x.amount ?? 0), 0), "XOF") },
          { label: "Failed", compute: (r) => String(r.filter((x) => x.status === "FAILED").length) },
        ]}
      />

      <ResourceTable
        resource="customer-transactions"
        columns={columns}
        exportName="transfers"
        searchPlaceholder="Search reference, beneficiary, bank…"
        filters={[
          { key: "transaction_type", label: "Rail" },
          { key: "status", label: "Status" },
          { key: "currency", label: "Currency" },
        ]}
        onRowClick={(row) => openDrawer("TRANSACTION", row)}
        onRowsLoaded={setRows}
      />
    </div>
  );
}
