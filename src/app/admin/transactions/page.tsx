"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, TextCell, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Transaction control center — live customer_transactions and
 * agency_transactions. The old page rendered a TRANSACTIONS constant of
 * invented rows; everything here is read from the database, and the stats
 * strip says exactly what it is computed from.
 */
export default function TransactionsPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"customer" | "agency">("customer");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const customerCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.reference}</span> },
    { key: "transaction_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.transaction_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "recipient_name", label: "Recipient", hideOnMobile: true, render: (r) => <TextCell value={r.recipient_name} /> },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold text-[var(--foreground)]">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "fee", label: "Fee", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.fee, r.currency)}</span> },
    { key: "provider_name", label: "Node", hideOnMobile: true, render: (r) => <TextCell value={r.provider_name} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const agencyCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.reference}</span> },
    { key: "transaction_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.transaction_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "customer_name", label: "Customer", hideOnMobile: true, render: (r) => <TextCell value={r.customer_name} /> },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold text-[var(--foreground)]">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "agent_commission", label: "Commission", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-emerald-400">{fmtMoney(r.agent_commission, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Transaction Control Center"
        title="Ecosystem Transactions"
        subtitle="Multi-currency transaction execution across the customer wallet rails and the agency banking network — read live from the ledger of record."
      />

      <StatsFromRows
        rows={rows}
        contextLabel={tab === "customer" ? "customer_transactions" : "agency_transactions"}
        stats={[
          { label: "Loaded records", compute: (r) => String(r.length) },
          { label: "NGN volume", compute: (r) => fmtMoney(r.filter((x) => x.currency === "NGN").reduce((s, x) => s + Number(x.amount ?? 0), 0), "NGN") },
          { label: "XOF volume", compute: (r) => fmtMoney(r.filter((x) => x.currency === "XOF").reduce((s, x) => s + Number(x.amount ?? 0), 0), "XOF") },
          { label: "Successful", compute: (r) => String(r.filter((x) => x.status === "SUCCESSFUL").length) },
        ]}
      />

      <div className="flex gap-2 text-xs font-bold">
        {(["customer", "agency"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "customer" ? "Customer wallet transactions" : "Agency network transactions"}
          </button>
        ))}
      </div>

      {tab === "customer" ? (
        <ResourceTable
          resource="customer-transactions"
          columns={customerCols}
          exportName="customer-transactions"
          searchPlaceholder="Search reference, recipient, narration, provider…"
          filters={[
            { key: "status", label: "Status" },
            { key: "transaction_type", label: "Type" },
            { key: "currency", label: "Currency" },
          ]}
          onRowClick={(row) => openDrawer("TRANSACTION", row)}
          onRowsLoaded={setRows}
        />
      ) : (
        <ResourceTable
          resource="agency-transactions"
          columns={agencyCols}
          exportName="agency-transactions"
          searchPlaceholder="Search reference, customer…"
          filters={[
            { key: "status", label: "Status" },
            { key: "transaction_type", label: "Type" },
          ]}
          onRowClick={(row) => openDrawer("TRANSACTION", row)}
          onRowsLoaded={setRows}
        />
      )}
    </div>
  );
}
