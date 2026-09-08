"use client";

// =============================================================================
// Transactions — engine-recorded operations (each with a real ledger journal
// id). Search, type filter, CSV export of the CURRENT server truth, receipts.
// =============================================================================

import React, { useMemo, useState } from "react";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  statusTone,
  AgentFreshnessBar,
} from "@/components/agent/ui/AgentUi";
import { Search, Download, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Activity } from "lucide-react";
import { formatMoney } from "@/lib/money";

const TYPE_OPTIONS = ["ALL", "CASH_IN", "CASH_OUT", "TRANSFER_NIP"];

export default function AgentTransactionsPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt, openReceipt, isBalanceHidden } = useAgentPortal();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [downloaded, setDownloaded] = useState(false);

  const ops = summary?.recentOperations || [];

  const filtered = useMemo(
    () =>
      ops.filter((op) => {
        const hay = `${op.reference} ${op.customerName || ""} ${op.title}`.toLowerCase();
        const matchSearch = hay.includes(search.toLowerCase());
        const matchType = type === "ALL" || op.type === type;
        return matchSearch && matchType;
      }),
    [ops, search, type],
  );

  if (phase === "loading") return <AgentPageSkeleton rows={5} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your transactions" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const exportCsv = () => {
    const headers = "Date,Reference,LedgerJournal,Type,Amount,CustomerFee,AgentCommission,CustomerName,Bank,Status\n";
    const rows = filtered
      .map(
        (op) =>
          `"${op.createdAt}","${op.reference}","${op.ledgerJournalId || ""}","${op.type}",${op.amount},${op.customerFee},${op.agentCommission},"${op.customerName || ""}","${op.customerBank || ""}","${op.status}"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koriepay-agent-operations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2500);
  };

  const totalVolume = filtered.reduce((s, o) => s + o.amount, 0);
  const totalCommission = filtered.reduce((s, o) => s + (o.agentCommission || 0), 0);

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Transactions"
        subtitle="Every operation below carries a real engine journal reference — receipts open on tap."
        actions={
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloaded ? "Exported" : "Export CSV"}
          </button>
        }
      />

      <AgentFreshnessBar
        refreshedAt={refreshedAt}
        refreshing={false}
        onRefresh={() => void refresh({ silent: true })}
        note={`${filtered.length} shown`}
      />

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search operations</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, customer, title…"
            className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                type === t
                  ? "bg-stone-900 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {t === "ALL" ? "All" : t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Totals of filtered set */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Count</p>
          <p className="text-lg font-bold text-stone-900">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Volume</p>
          <p className="text-lg font-bold text-stone-900">{isBalanceHidden ? "••••" : formatMoney(totalVolume, "NGN")}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Commission</p>
          <p className="text-lg font-bold text-emerald-700">{isBalanceHidden ? "••••" : formatMoney(totalCommission, "NGN")}</p>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <Activity aria-hidden="true" className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">
            {ops.length === 0 ? "No operations yet" : "No operations match your filters"}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {ops.length === 0
              ? "Run a cash-in, cash-out or transfer — engine-recorded operations will appear here with real journal references."
              : "Try clearing the search or switching the type filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((op) => (
            <li key={op.id}>
              <button
                type="button"
                onClick={() => openReceipt(op)}
                className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 text-left shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                    op.type === "CASH_IN"
                      ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
                      : op.type === "CASH_OUT"
                        ? "bg-amber-50 text-amber-600 ring-amber-200"
                        : "bg-sky-50 text-sky-600 ring-sky-200"
                  }`}
                >
                  {op.type === "CASH_IN" ? (
                    <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                  ) : op.type === "CASH_OUT" ? (
                    <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">{op.title}</span>
                    <AgentChip label={op.status} tone={statusTone(op.status)} />
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-stone-500">
                    {op.customerName || "Walk-in customer"} · {new Date(op.createdAt).toLocaleString("en-GB")}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-stone-400">
                    {op.reference} {op.ledgerJournalId ? `· ${op.ledgerJournalId}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-stone-900">
                    {isBalanceHidden ? "••••" : formatMoney(op.totalAmount || op.amount, op.currency)}
                  </span>
                  <span className="block text-[10px] font-semibold text-emerald-600">
                    +{isBalanceHidden ? "•" : formatMoney(op.agentCommission || 0, op.currency)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
