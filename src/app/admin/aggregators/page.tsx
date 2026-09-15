"use client";

import React from "react";
import { PageHeader, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * Aggregator network — live view of public.aggregators plus the automated
 * daily reconciliation rows (public.aggregator_reconciliations, written by
 * run_aggregator_reconciliation). The previous build shipped two hardcoded
 * rows ("Arewa FinTech Super-Agent Consortium" etc.); every number now
 * comes from the database.
 *
 * Reconciliation semantics (migration 000056): MATCHED is only ever written
 * when BOTH sides (ledger movement and ingested bank statement) were
 * computed and agree. A NULL bank total means no statement was ingested for
 * that date — the row sits in PENDING_REVIEW until one arrives, and ages
 * into a close exception after 3 days.
 */
export default function AggregatorsPage() {
  const columns: ResourceColumn[] = [
    { key: "aggregator_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.aggregator_code}</span> },
    { key: "business_name", label: "Business" },
    { key: "country", label: "Country" },
    { key: "legal_entity", label: "Legal entity", hideOnMobile: true },
    { key: "kyb_status", label: "KYB", render: (r) => <StatusChip value={r.kyb_status as string} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
    { key: "float_account_id", label: "Float account", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.float_account_id ? String(r.float_account_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "created_at", label: "Onboarded", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
  ];

  const reconColumns: ResourceColumn[] = [
    { key: "reconciliation_date", label: "Date" },
    { key: "currency", label: "Currency", hideOnMobile: true },
    { key: "channel_or_entity", label: "Channel", hideOnMobile: true },
    {
      key: "internal_ledger_total",
      label: "Ledger (internal)",
      render: (r) => <span className="tabular-nums">{r.internal_ledger_total == null ? "—" : Number(r.internal_ledger_total).toLocaleString()}</span>,
    },
    {
      key: "bank_settled_total",
      label: "Bank statement",
      render: (r) => (
        <span className="tabular-nums" title={r.bank_settled_total == null ? "No bank statement ingested for this date" : undefined}>
          {r.bank_settled_total == null ? "no statement" : Number(r.bank_settled_total).toLocaleString()}
        </span>
      ),
    },
    {
      key: "variance_amount",
      label: "Variance",
      render: (r) => <span className="tabular-nums">{r.variance_amount == null ? "—" : Number(r.variance_amount).toLocaleString()}</span>,
    },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Agency Network"
        title="Super-Aggregators & Distribution Consortia"
        subtitle="Aggregator entities, KYB standing and float accounts across Nigeria and Niger Republic — read live from the platform database."
      />
      <ResourceTable
        resource="aggregators"
        columns={columns}
        exportName="aggregators"
        searchPlaceholder="Search code, business name, legal entity…"
        filters={[
          { key: "status", label: "Status" },
          { key: "country", label: "Country" },
          { key: "kyb_status", label: "KYB" },
        ]}
      />
      <PageHeader
        eyebrow="Daily Reconciliation"
        title="Automated Reconciliation Runs"
        subtitle="Every row is computed from real journal movements on the aggregator's float/escrow/reserve accounts versus ingested bank statements — a MATCHED status is never written without computing both sides. 'no statement' means the bank side has not been ingested yet (PENDING_REVIEW)."
      />
      <ResourceTable
        resource="aggregator-reconciliations"
        columns={reconColumns}
        exportName="aggregator-reconciliations"
        searchPlaceholder="Search channel, provider node…"
        filters={[
          { key: "status", label: "Status" },
          { key: "currency", label: "Currency" },
        ]}
      />
    </div>
  );
}
