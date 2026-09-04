"use client";

import React, { useState, useMemo } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { TRANSACTIONS } from "@/services/adminDataService";
import {
  ArrowRightLeft,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function TransactionsPage() {
  const { countryFilter, openDrawer } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredTransactions = useMemo(() => {
    return TRANSACTIONS.filter((tx) => {
      // Country
      const matchesCountry =
        countryFilter === "GLOBAL" || tx.countryCode === countryFilter;

      // Status
      const matchesStatus =
        statusFilter === "ALL" || tx.status === statusFilter;

      // Type
      const matchesType =
        typeFilter === "ALL" || tx.type === typeFilter;

      // Search Query
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q.trim() ||
        tx.reference.toLowerCase().includes(q) ||
        tx.sender.name.toLowerCase().includes(q) ||
        tx.recipient.name.toLowerCase().includes(q) ||
        tx.provider.name.toLowerCase().includes(q);

      return matchesCountry && matchesStatus && matchesType && matchesQuery;
    });
  }, [countryFilter, statusFilter, typeFilter, searchQuery]);

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Reference,Market,Type,Channel,Amount,Currency,Status,Sender,Recipient,Provider,Timestamp\n" +
      filteredTransactions
        .map(
          (t) =>
            `"${t.reference}","${t.country}","${t.type}","${t.channel}",${t.amount},"${t.currency}","${t.status}","${t.sender.name}","${t.recipient.name}","${t.provider.name}","${t.createdAt}"`
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `koriepay-transactions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              TRANSACTION CONTROL CENTER
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Global Ecosystem Transactions
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-currency transaction execution, NIP interbank routing, and bilateral cross-border telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference, sender, recipient..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESSFUL">Successful</option>
            <option value="PROCESSING">Processing</option>
            <option value="FAILED">Failed</option>
            <option value="REVERSED">Reversed</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Types</option>
            <option value="TRANSFER_CROSS_BORDER">Cross-Border Transfer</option>
            <option value="TRANSFER_NIP">NIP Domestic</option>
            <option value="AGENCY_CASH_OUT">Agency Cash-Out</option>
            <option value="MERCHANT_QR_PAYMENT">Merchant QR</option>
            <option value="BDC_FX_SWAP">BDC FX Swap</option>
          </select>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">Reference</th>
                <th className="p-4 font-semibold">Market</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Channel</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Sender / Recipient</th>
                <th className="p-4 font-semibold">Gateway Node</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => openDrawer("TRANSACTION", tx)}
                    className="hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 font-mono font-bold text-white group-hover:text-emerald-400">
                      {tx.reference}
                    </td>
                    <td className="p-4 font-mono">
                      {tx.countryCode === "NG" ? "🇳🇬 NG" : "🇳🇪 NE"}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-white/5 text-slate-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {tx.channel}
                    </td>
                    <td className="p-4 font-mono font-bold text-white">
                      {tx.currency === "NGN" ? "₦" : "CFA "}
                      {tx.amount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{tx.sender.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">↳ {tx.recipient.name}</div>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {tx.provider.name}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          tx.status === "SUCCESSFUL"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : tx.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        ● {tx.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-400 group-hover:underline">
                      Details ↗
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
