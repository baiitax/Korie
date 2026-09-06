"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate, StatsFromRows } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Wallet ledger — live view of public.wallets. The old page merged two
 * invented constants (CUSTOMERS / AGENTS) and a fake freeze flow through
 * the maker-checker modal; balances and limits now come from the database
 * and status actions go through the audited registry PATCH.
 */
export default function WalletsAdminPage() {
  const { openDrawer } = useAdmin();
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const columns: ResourceColumn[] = [
    { key: "updated_at", label: "Updated", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.updated_at)}</span> },
    { key: "customer_id", label: "Customer", render: (r) => <span className="font-mono text-[var(--foreground)]">{r.customer_id ? String(r.customer_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "country", label: "Country" },
    { key: "currency", label: "Ccy" },
    { key: "balance", label: "Balance", className: "text-right", render: (r) => <span className="font-bold text-[var(--foreground)]">{fmtMoney(r.balance, r.currency)}</span> },
    { key: "locked_balance", label: "Locked", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-amber-400">{fmtMoney(r.locked_balance, r.currency)}</span> },
    { key: "daily_limit", label: "Daily limit", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.daily_limit, r.currency)}</span> },
    { key: "daily_spent", label: "Spent today", hideOnMobile: true, className: "text-right", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtMoney(r.daily_spent, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Customers"
        title="Customer Wallets"
        subtitle="Wallet balances, locked funds and daily limits straight from the wallets table. Open a wallet row to inspect and act on it."
      />

      <StatsFromRows
        rows={rows}
        contextLabel="wallets (current filter)"
        stats={[
          { label: "Loaded wallets", compute: (r) => String(r.length) },
          { label: "NGN balance", compute: (r) => fmtMoney(r.filter((x) => x.currency === "NGN").reduce((s, x) => s + Number(x.balance ?? 0), 0), "NGN") },
          { label: "XOF balance", compute: (r) => fmtMoney(r.filter((x) => x.currency === "XOF").reduce((s, x) => s + Number(x.balance ?? 0), 0), "XOF") },
          { label: "Not active", compute: (r) => String(r.filter((x) => x.status !== "ACTIVE").length) },
        ]}
      />

      <ResourceTable
        resource="wallets"
        columns={columns}
        exportName="wallets"
        searchPlaceholder="Filter is column-based — use the dropdowns below"
        filters={[
          { key: "status", label: "Status" },
          { key: "country", label: "Country" },
          { key: "currency", label: "Ccy" },
        ]}
        onRowClick={(row) => openDrawer("LEDGER", row)}
        onRowsLoaded={setRows}
      />
    </div>
  );
}
