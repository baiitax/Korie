"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, TextCell, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Payment switch — live payments (all rails) and refunds. The old page fed
 * from in-memory /api/payments/switch; the payment records and their
 * financial/settlement/reconciliation states now come from the payments
 * table as the switch actually wrote them.
 */
export default function PaymentsPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"payments" | "refunds">("payments");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const paymentCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.reference}</span> },
    { key: "channel", label: "Channel", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.channel ?? "—").replaceAll("_", " ")}</span> },
    { key: "beneficiary_name", label: "Beneficiary", hideOnMobile: true, render: (r) => <TextCell value={r.beneficiary_name} /> },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "fee_amount", label: "Fee", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.fee_amount, r.currency)}</span> },
    { key: "financial_state", label: "State", render: (r) => <StatusChip value={r.financial_state} /> },
    { key: "settlement_state", label: "Settlement", hideOnMobile: true, render: (r) => <StatusChip value={r.settlement_state} /> },
  ];

  const refundCols: ResourceColumn[] = [
    { key: "created_at", label: "Requested", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "refund_reference", label: "Refund", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.refund_reference}</span> },
    { key: "refund_type", label: "Type", hideOnMobile: true },
    { key: "original_amount", label: "Original", className: "text-right", render: (r) => <span>{fmtMoney(r.original_amount, r.currency)}</span> },
    { key: "refund_amount", label: "Refund", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.refund_amount, r.currency)}</span> },
    { key: "refund_reason", label: "Reason", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Operations"
        title="Payment Switch"
        subtitle="Every payment across agency banking, cards, FX remittance and direct debit rails — financial, settlement and reconciliation states as the switch recorded them."
      />

      {tab === "payments" && (
        <StatsFromRows
          rows={rows}
          contextLabel="payments (current filter)"
          stats={[
            { label: "Loaded payments", compute: (r) => String(r.length) },
            { label: "NGN volume", compute: (r) => fmtMoney(r.filter((x) => x.currency === "NGN").reduce((s, x) => s + Number(x.amount ?? 0), 0), "NGN") },
            { label: "XOF volume", compute: (r) => fmtMoney(r.filter((x) => x.currency === "XOF").reduce((s, x) => s + Number(x.amount ?? 0), 0), "XOF") },
            { label: "Failed", compute: (r) => String(r.filter((x) => x.financial_state === "FAILED").length) },
          ]}
        />
      )}

      <div className="flex gap-2 text-xs font-bold">
        {(["payments", "refunds"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "payments" ? "Payments" : "Refunds"}
          </button>
        ))}
      </div>

      {tab === "payments" ? (
        <ResourceTable
          resource="payments"
          columns={paymentCols}
          exportName="payments"
          searchPlaceholder="Search reference, beneficiary, sender…"
          filters={[
            { key: "status", label: "State" },
            { key: "channel", label: "Channel" },
            { key: "currency", label: "Ccy" },
          ]}
          onRowClick={(row) => openDrawer("TRANSACTION", row)}
          onRowsLoaded={setRows}
        />
      ) : (
        <ResourceTable
          resource="payment-refunds"
          columns={refundCols}
          exportName="payment-refunds"
          searchPlaceholder="Search refund reference…"
          filters={[{ key: "status", label: "Status" }]}
          onRowClick={(row) => openDrawer("REFUND", row)}
        />
      )}
    </div>
  );
}
