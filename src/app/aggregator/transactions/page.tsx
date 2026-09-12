"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Receipt,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";

export default function AggregatorTransactionsPage() {
  const {
    transactions,
    territories,
    selectedTerritoryId,
    setSelectedTerritoryId,
    formatCurrency,
    formatDate,
    openTransactionInvestigation,
    t,
  } = useAggregator();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");

  const filteredTransactions = transactions.filter((tx) => {
    const matchesTerritory =
      selectedTerritoryId === "ALL" || tx.territoryName.includes(selectedTerritoryId);
    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
    const matchesChannel = channelFilter === "ALL" || tx.channel === channelFilter;
    const matchesSearch =
      tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.correlationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.agentName && tx.agentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.merchantName && tx.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTerritory && matchesStatus && matchesChannel && matchesSearch;
  });

  const exportCSV = () => {
    const headers = "Reference,CorrelationID,Entity,Territory,Type,Channel,Amount,AggregatorCommission,Status,Timestamp\n";
    const rows = filteredTransactions
      .map(
        (t) =>
          `"${t.reference}","${t.correlationId}","${t.agentName || t.merchantName}","${t.territoryName}","${t.type}","${t.channel}",${t.amount},${t.aggregatorCommission},"${t.status}","${t.createdAt}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sahel-syndicate-transactions-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Network Transaction Command Center</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Immutable settlement stream across Agency Cash-In/Out, Dynamic NUBAN Transfers, and Card POS Terminals
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
            <input
              type="text"
              placeholder="Search reference, correlation ID, agent, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESSFUL">SUCCESSFUL</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Payment Rails</option>
              <option value="CARD_POS">Card POS Terminal</option>
              <option value="BANK_TRANSFER">Dynamic Bank Transfer</option>
              <option value="PAYMENT_LINK">Payment Link</option>
              <option value="QR_CODE">QR Code Standee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)] text-[var(--foreground-muted)] font-mono uppercase text-[10px] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Reference / Correlation</th>
                <th className="px-4 py-3">Executing Entity & Territory</th>
                <th className="px-4 py-3">Type & Channel</th>
                <th className="px-4 py-3 text-right">Gross Volume</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-4 py-3 text-right">Aggr. Commission</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-bold text-[var(--foreground)]">{tx.reference}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)] font-mono">{tx.correlationId}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-[var(--foreground)] font-bold">{tx.agentName || tx.merchantName}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">
                      {tx.territoryName} • {tx.customerName}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-[var(--surface-2)] text-teal-600 dark:text-teal-300 border border-[var(--border)]">
                      {tx.type} • {tx.channel.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-[var(--foreground)]">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-[var(--foreground-muted)]">
                    {formatCurrency(tx.fee)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(tx.aggregatorCommission)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        tx.status === "SUCCESSFUL"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : tx.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => openTransactionInvestigation(tx)}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-300 text-[11px] font-bold border border-teal-500/20"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
