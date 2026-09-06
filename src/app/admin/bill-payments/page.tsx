"use client";

import React from "react";
import { PageHeader, fmtMoney, fmtDate, TextCell } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Bill payments — agency banking transactions by type, live from
 * public.agency_transactions. Transaction types (CASH_IN / CASH_OUT /
 * BILL_PAYMENT / …) come from the database via the facet endpoint; the old
 * page invented "KEDCO Electricity" rows.
 */
export default function BillPaymentsPage() {
  const columns: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.reference}</span> },
    { key: "transaction_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.transaction_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "customer_name", label: "Customer", render: (r) => <TextCell value={r.customer_name} /> },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold text-[var(--foreground)]">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "customer_fee", label: "Fee", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.customer_fee, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Operations"
        title="Bill Payments & Agency Services"
        subtitle="Agency counter transactions — bill settlements, cash-in, cash-out — read live from agency_transactions with exact fee and commission figures."
      />
      <ResourceTable
        resource="agency-transactions"
        columns={columns}
        exportName="bill-payments"
        searchPlaceholder="Search reference, customer name, phone…"
        filters={[
          { key: "transaction_type", label: "Type" },
          { key: "status", label: "Status" },
        ]}
      />
    </div>
  );
}
