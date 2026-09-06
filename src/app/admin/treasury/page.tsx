"use client";

import React, { useState } from "react";
import { PageHeader, fmtMoney, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";

/**
 * Treasury — live treasury accounts, deals, positions and funding
 * facilities. The old page ran in-memory funding/deal engines; every deal
 * and position here is what treasury actually booked.
 */
export default function TreasuryPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"accounts" | "deals" | "positions" | "facilities">("accounts");

  const accountCols: ResourceColumn[] = [
    { key: "account_code", label: "Account", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.account_code}</span> },
    { key: "account_type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.account_type ?? "—").replaceAll("_", " ")}</span> },
    { key: "currency", label: "Ccy" },
    { key: "country_code", label: "Country", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const dealCols: ResourceColumn[] = [
    { key: "created_at", label: "Created", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "deal_reference", label: "Deal", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.deal_reference}</span> },
    { key: "deal_type", label: "Type" },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "value_date", label: "Value date", hideOnMobile: true },
    { key: "settlement_date", label: "Settlement", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const positionCols: ResourceColumn[] = [
    { key: "position_code", label: "Position", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.position_code}</span> },
    { key: "currency", label: "Ccy" },
    { key: "gross_balance", label: "Gross", className: "text-right", render: (r) => <span>{fmtMoney(r.gross_balance, r.currency)}</span> },
    { key: "available_liquidity", label: "Available", className: "text-right", render: (r) => <span className="font-bold text-emerald-400">{fmtMoney(r.available_liquidity, r.currency)}</span> },
    { key: "restricted_liquidity", label: "Restricted", className: "text-right", render: (r) => <span className="text-amber-400">{fmtMoney(r.restricted_liquidity, r.currency)}</span> },
    { key: "pending_settlement", label: "Pending", className: "text-right", render: (r) => <span>{fmtMoney(r.pending_settlement, r.currency)}</span> },
    { key: "liquidity_status", label: "Health", render: (r) => <StatusChip value={r.liquidity_status} /> },
  ];

  const facilityCols: ResourceColumn[] = [
    { key: "facility_code", label: "Facility", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.facility_code}</span> },
    { key: "facility_type", label: "Type" },
    { key: "legal_entity", label: "Legal entity", hideOnMobile: true },
    { key: "currency", label: "Ccy" },
    { key: "total_committed_limit", label: "Committed", className: "text-right", render: (r) => <span>{fmtMoney(r.total_committed_limit, r.currency)}</span> },
    { key: "utilized_amount", label: "Utilized", className: "text-right", render: (r) => <span className="text-amber-400">{fmtMoney(r.utilized_amount, r.currency)}</span> },
    { key: "available_undrawn", label: "Undrawn", className: "text-right", render: (r) => <span className="font-bold text-emerald-400">{fmtMoney(r.available_undrawn, r.currency)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Treasury & Liquidity"
        subtitle="Treasury accounts, booked deals, liquidity positions and funding facilities across the NG/NE legal entities — live from the treasury tables."
      />

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {(["accounts", "deals", "positions", "facilities"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t === "accounts" ? "Accounts" : t === "deals" ? "Deals" : t === "positions" ? "Positions" : "Funding facilities"}
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <ResourceTable
          resource="treasury-accounts"
          columns={accountCols}
          exportName="treasury-accounts"
          searchPlaceholder="Search account code…"
          filters={[
            { key: "account_type", label: "Type" },
            { key: "currency", label: "Ccy" },
          ]}
        />
      )}
      {tab === "deals" && (
        <ResourceTable
          resource="treasury-deals"
          columns={dealCols}
          exportName="treasury-deals"
          searchPlaceholder="Search deal reference…"
          filters={[
            { key: "status", label: "Status" },
            { key: "deal_type", label: "Type" },
          ]}
          onRowClick={(row) => openDrawer("TREASURY_DEAL", row)}
        />
      )}
      {tab === "positions" && (
        <ResourceTable
          resource="treasury-positions"
          columns={positionCols}
          exportName="treasury-positions"
          searchPlaceholder="Search position code…"
          filters={[{ key: "liquidity_status", label: "Health" }]}
        />
      )}
      {tab === "facilities" && (
        <ResourceTable
          resource="funding-facilities"
          columns={facilityCols}
          exportName="funding-facilities"
          searchPlaceholder="Search facility code, legal entity…"
          filters={[
            { key: "status", label: "Status" },
            { key: "facility_type", label: "Type" },
          ]}
        />
      )}
    </div>
  );
}
