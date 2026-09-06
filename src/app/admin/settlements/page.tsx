"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Settlements — live settlement_batches with per-node settlement lines.
 * The old page called in-memory /api/core/v1/settlements; batches here are
 * exactly what the settlement engine wrote to the database.
 */
export default function SettlementsPage() {
  const { openDrawer } = useAdmin();
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const batchCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "batch_reference", label: "Batch", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.batch_reference}</span> },
    { key: "settlement_node", label: "Node", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{r.settlement_node ?? "—"}</span> },
    { key: "total_transactions", label: "Txns", className: "text-right" },
    { key: "gross_amount", label: "Gross", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.gross_amount, r.currency)}</span> },
    { key: "fee_amount", label: "Fees", className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.fee_amount, r.currency)}</span> },
    { key: "net_settlement_amount", label: "Net", className: "text-right", render: (r) => <span className="font-bold text-[var(--brand-primary)]">{fmtMoney(r.net_settlement_amount, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
    { key: "settled_at", label: "Settled", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.settled_at ? fmtDate(r.settled_at) : "—"}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Settlement Batches"
        subtitle="Agent commission settlement batches per banking node, with gross/fee/net breakdowns exactly as computed by the settlement engine."
      />

      <StatsFromRows
        rows={rows}
        contextLabel="settlement_batches (current filter)"
        stats={[
          { label: "Loaded batches", compute: (r) => String(r.length) },
          { label: "Pending", compute: (r) => String(r.filter((x) => x.status === "PENDING" || x.status === "PROCESSING").length) },
          { label: "NGN net", compute: (r) => fmtMoney(r.filter((x) => x.currency === "NGN").reduce((s, x) => s + Number(x.net_settlement_amount ?? 0), 0), "NGN") },
          { label: "XOF net", compute: (r) => fmtMoney(r.filter((x) => x.currency === "XOF").reduce((s, x) => s + Number(x.net_settlement_amount ?? 0), 0), "XOF") },
        ]}
      />

      <ResourceTable
        resource="settlement-batches"
        columns={batchCols}
        exportName="settlement-batches"
        searchPlaceholder="Search batch reference…"
        filters={[
          { key: "status", label: "Status" },
          { key: "settlement_node", label: "Node" },
          { key: "currency", label: "Ccy" },
        ]}
        onRowClick={(row) => openDrawer("LEDGER", row)}
        onRowsLoaded={setRows}
      />
    </div>
  );
}
