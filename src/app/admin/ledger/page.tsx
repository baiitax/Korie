"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Ledger & GL — live ledger_accounts, journal_entries and the GL chart.
 * The old page rendered an in-memory GL engine's trial balance; the portal
 * now shows the double-entry ledger as persisted.
 */
export default function LedgerPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"accounts" | "journals" | "gl">("accounts");

  const accountCols: ResourceColumn[] = [
    { key: "account_number", label: "Account", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.account_number}</span> },
    { key: "name", label: "Name" },
    { key: "type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.type ?? "—").replaceAll("_", " ")}</span> },
    { key: "currency", label: "Ccy" },
    { key: "country", label: "Country", hideOnMobile: true },
    { key: "balance", label: "Balance", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.balance, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const journalCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "journal_number", label: "Journal", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.journal_number}</span> },
    { key: "description", label: "Description", hideOnMobile: true },
    { key: "rule_code", label: "Rule", hideOnMobile: true },
    { key: "total_debit", label: "Debit", className: "text-right", render: (r) => <span>{fmtMoney(r.total_debit, r.currency)}</span> },
    { key: "total_credit", label: "Credit", className: "text-right", render: (r) => <span>{fmtMoney(r.total_credit, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
    { key: "effective_at", label: "Effective", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.effective_at)}</span> },
  ];

  const glCols: ResourceColumn[] = [
    { key: "account_code", label: "Code", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.account_code}</span> },
    { key: "account_name", label: "Account" },
    { key: "category", label: "Category" },
    { key: "normal_balance", label: "Normal", hideOnMobile: true },
    { key: "currency", label: "Ccy" },
    { key: "is_subledger_control", label: "Subledger", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{r.is_subledger_control ? (r.subledger_type ?? "Yes") : "—"}</span> },
    { key: "is_active", label: "State", render: (r) => <StatusChip value={r.is_active ? "ACTIVE" : "INACTIVE"} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Ledger & General Ledger"
        subtitle="Operational ledger accounts, posted journal entries and the GL chart of accounts — the persisted double-entry records."
      />

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {(["accounts", "journals", "gl"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "accounts" ? "Ledger accounts" : t === "journals" ? "Journal entries" : "GL chart"}
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <ResourceTable
          resource="ledger-accounts"
          columns={accountCols}
          exportName="ledger-accounts"
          searchPlaceholder="Search account number, name…"
          filters={[
            { key: "type", label: "Type" },
            { key: "currency", label: "Ccy" },
          ]}
          onRowClick={(row) => openDrawer("LEDGER", row)}
        />
      )}
      {tab === "journals" && (
        <ResourceTable
          resource="journal-entries"
          columns={journalCols}
          exportName="journal-entries"
          searchPlaceholder="Search journal number, description…"
          filters={[
            { key: "status", label: "Status" },
            { key: "currency", label: "Ccy" },
          ]}
        />
      )}
      {tab === "gl" && (
        <ResourceTable
          resource="gl-accounts"
          columns={glCols}
          exportName="gl-accounts"
          searchPlaceholder="Search GL code, name…"
          filters={[
            { key: "category", label: "Category" },
            { key: "currency", label: "Ccy" },
          ]}
        />
      )}
    </div>
  );
}
