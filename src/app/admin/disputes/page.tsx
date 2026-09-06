"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, TextCell, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Disputes & chargebacks — live customer_disputes, dispute_cases and
 * chargeback_cases. The old page fed from an in-memory /api/disputes
 * engine; case status now moves through audited PATCHes.
 */
export default function DisputesPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"customer" | "formal" | "chargebacks">("customer");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const customerCols: ResourceColumn[] = [
    { key: "created_at", label: "Raised", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "ticket_number", label: "Ticket", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.ticket_number}</span> },
    { key: "category", label: "Category" },
    { key: "transaction_reference", label: "Transaction", hideOnMobile: true, render: (r) => <TextCell value={r.transaction_reference} /> },
    { key: "disputed_amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.disputed_amount, r.currency)}</span> },
    { key: "priority", label: "Priority", render: (r) => <StatusChip value={r.priority} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const formalCols: ResourceColumn[] = [
    { key: "created_at", label: "Opened", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "dispute_reference", label: "Case", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.dispute_reference}</span> },
    { key: "category", label: "Category" },
    { key: "claimant_type", label: "Claimant", hideOnMobile: true },
    { key: "claim_amount", label: "Claim", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.claim_amount, r.currency)}</span> },
    { key: "held_reserve_amount", label: "Reserve held", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-amber-400">{fmtMoney(r.held_reserve_amount, r.currency)}</span> },
    { key: "priority", label: "Priority", render: (r) => <StatusChip value={r.priority} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const chargebackCols: ResourceColumn[] = [
    { key: "created_at", label: "Received", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "chargeback_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.chargeback_reference}</span> },
    { key: "transaction_reference", label: "Transaction", hideOnMobile: true },
    { key: "network_source", label: "Network" },
    { key: "reason_code", label: "Reason", hideOnMobile: true },
    { key: "response_deadline", label: "Deadline", render: (r) => <span className={r.response_deadline && new Date(String(r.response_deadline)) < new Date() ? "text-rose-400 font-bold" : "text-[var(--foreground-muted)]"}>{fmtDate(r.response_deadline)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Support"
        title="Disputes & Chargebacks"
        subtitle="Customer-raised disputes, formal dispute cases and card-network chargebacks, all read live. Status changes are audited."
      />

      {tab === "customer" && (
        <StatsFromRows
          rows={rows}
          contextLabel="customer_disputes (current filter)"
          stats={[
            { label: "Loaded disputes", compute: (r) => String(r.length) },
            { label: "Open", compute: (r) => String(r.filter((x) => x.status === "OPEN").length) },
            { label: "Escalated", compute: (r) => String(r.filter((x) => x.status === "ESCALATED").length) },
            { label: "Resolved", compute: (r) => String(r.filter((x) => x.status === "RESOLVED").length) },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {(["customer", "formal", "chargebacks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "customer" ? "Customer disputes" : t === "formal" ? "Formal cases" : "Chargebacks"}
          </button>
        ))}
      </div>

      {tab === "customer" && (
        <ResourceTable
          resource="customer-disputes"
          columns={customerCols}
          exportName="customer-disputes"
          searchPlaceholder="Search ticket, reference, description…"
          filters={[
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
          ]}
          onRowClick={(row) => openDrawer("DISPUTE", row)}
          onRowsLoaded={setRows}
        />
      )}
      {tab === "formal" && (
        <ResourceTable
          resource="dispute-cases"
          columns={formalCols}
          exportName="dispute-cases"
          searchPlaceholder="Search dispute reference…"
          filters={[
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
          ]}
          onRowClick={(row) => openDrawer("DISPUTE_CASE", row)}
        />
      )}
      {tab === "chargebacks" && (
        <ResourceTable
          resource="chargebacks"
          columns={chargebackCols}
          exportName="chargebacks"
          searchPlaceholder="Search chargeback or transaction reference…"
          filters={[{ key: "status", label: "Status" }]}
          onRowClick={(row) => openDrawer("CHARGEBACK", row)}
        />
      )}
    </div>
  );
}
