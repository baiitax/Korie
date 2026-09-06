"use client";

import React from "react";
import { PageHeader, fmtMoney, fmtDate, fmtAgo } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";

/**
 * FX desk — three live views: fx_rates (reference rates), liquidity.fx
 * transactions (executed conversions) and treasury FX positions. The old
 * "Live Push (12s ago)" rate feed was hardcoded; rates now show exactly
 * what fx_rates holds and when it was actually updated.
 */
export default function FxPage() {
  const rateCols: ResourceColumn[] = [
    { key: "source_currency", label: "Pair", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.source_currency} → {r.destination_currency}</span> },
    { key: "rate", label: "Rate", className: "text-right", render: (r) => <span className="font-bold text-[var(--brand-primary)]">{typeof r.rate === "number" ? r.rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span> },
    { key: "source", label: "Source" },
    { key: "updated_by", label: "Updated by", hideOnMobile: true },
    { key: "updated_at", label: "Last update", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.updated_at)}</span> },
  ];

  const txCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "fx_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.fx_reference}</span> },
    { key: "source_currency", label: "Leg", render: (r) => <span>{fmtMoney(r.source_amount, r.source_currency)} → {fmtMoney(r.target_amount, r.target_currency)}</span> },
    { key: "exchange_rate", label: "Rate", className: "text-right", render: (r) => <span>{typeof r.exchange_rate === "number" ? r.exchange_rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span> },
    { key: "approved_by", label: "Approved by", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
  ];

  const posCols: ResourceColumn[] = [
    { key: "currency_pair", label: "Pair", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.currency_pair}</span> },
    { key: "quote_currency", label: "Quote ccy" },
    { key: "net_exposure_base_minor", label: "Net exposure", className: "text-right", render: (r) => <span className="font-bold">{typeof r.net_exposure_base_minor === "number" ? (r.net_exposure_base_minor / 100).toLocaleString() : "—"}</span> },
    { key: "average_acquisition_rate", label: "Avg acq. rate", hideOnMobile: true, className: "text-right" },
    { key: "current_reference_rate", label: "Ref. rate", hideOnMobile: true, className: "text-right" },
    { key: "unrealized_pnl_minor", label: "Unrealized P&L", className: "text-right", render: (r) => <span className={Number(r.unrealized_pnl_minor) >= 0 ? "text-emerald-400" : "text-rose-400"}>{typeof r.unrealized_pnl_minor === "number" ? (r.unrealized_pnl_minor / 100).toLocaleString() : "—"}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Foreign Exchange Desk"
        subtitle="Reference rates from fx_rates, executed conversions from the liquidity engine and treasury FX exposure — all read live from the database."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Reference rates</h2>
        <ResourceTable resource="fx-rates" columns={rateCols} exportName="fx-rates" searchPlaceholder="Search currency, source…" limit={50} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Executed FX transactions</h2>
        <ResourceTable
          resource="fx-transactions"
          columns={txCols}
          exportName="fx-transactions"
          searchPlaceholder="Search FX reference…"
          filters={[{ key: "status", label: "Status" }, { key: "source_currency", label: "Source" }]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Treasury FX positions</h2>
        <ResourceTable resource="fx-positions" columns={posCols} exportName="fx-positions" limit={50} />
      </section>
    </div>
  );
}
