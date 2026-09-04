"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import NetworkCommandHero from "@/components/aggregator/ui/NetworkCommandHero";
import {
  Users,
  Store,
  MapPin,
  TrendingUp,
  Receipt,
  AlertOctagon,
  ShieldCheck,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Activity,
  Coins,
  Zap,
  Globe,
  Radio,
} from "lucide-react";

export default function AggregatorDashboard() {
  const {
    aggregator,
    agents,
    merchants,
    territories,
    transactions,
    exceptions,
    riskAlerts,
    selectedTerritoryId,
    formatCurrency,
    formatDate,
    openLiquidityModal,
    openTransactionInvestigation,
    t,
  } = useAggregator();

  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = transactions
    .filter((tx) => {
      const matchesTerritory =
        selectedTerritoryId === "ALL" || tx.territoryName.includes(selectedTerritoryId);
      const matchesSearch =
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.agentName && tx.agentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.merchantName && tx.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tx.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTerritory && matchesSearch;
    })
    .slice(0, 7);

  const openExceptions = exceptions.filter((e) => e.currentState !== "RESOLVED");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Financial Network Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervising {aggregator.activeAgentsCount} Agents & {aggregator.activeMerchantsCount} Merchants across Nigeria & Niger Republic
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
            RC: {aggregator.rcNumber}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Providus Node Live</span>
          </span>
        </div>
      </div>

      {/* Network Command Hero */}
      <NetworkCommandHero />

      {/* Operational Exceptions Warning Banner (if any) */}
      {openExceptions.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-amber-300">
                {openExceptions.length} Operational Exception Requiring Float / Compliance Attention
              </div>
              <div className="text-[11px] text-slate-400">
                {openExceptions[0].affectedEntity} — {openExceptions[0].description}
              </div>
            </div>
          </div>
          <Link
            href="/aggregator/exceptions"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap self-start sm:self-auto transition-colors"
          >
            Review Exceptions
          </Link>
        </div>
      )}

      {/* Territory Breakdown Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Territory Financial Performance</span>
          </div>
          <Link
            href="/aggregator/territories"
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>Manage All Territories ({territories.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {territories.map((terr) => (
            <div
              key={terr.id}
              className="p-4 rounded-2xl bg-[#091122] border border-white/10 hover:border-teal-500/30 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{terr.name}</h3>
                  <div className="text-[11px] text-slate-400">{terr.stateOrRegion}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {terr.country === "NG" ? "🇳🇬 NGN" : "🇳🇪 XOF"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Active Nodes:</span>
                  <span className="text-white font-medium">
                    {terr.activeAgentsCount} Agt • {terr.activeMerchantsCount} Mch
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Supervisor:</span>
                  <span className="text-slate-300 truncate max-w-[120px]">{terr.supervisorName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-slate-400 font-mono">Today's TPV:</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(terr.todayTPV)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Transaction Feed Table */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#060a16]">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-teal-400 animate-pulse" />
            <div>
              <h2 className="text-base font-bold text-white">Live Network Transaction Stream</h2>
              <p className="text-xs text-slate-400">
                Transactions flowing across distributed POS terminals, dynamic NUBANs, and agency cash points
              </p>
            </div>
          </div>
          <Link
            href="/aggregator/transactions"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <span>Full Transaction Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#070c18] border-b border-white/5 flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, agent, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a16] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Reference / Correlation</th>
                <th className="px-4 py-3">Executing Node</th>
                <th className="px-4 py-3">Type & Channel</th>
                <th className="px-4 py-3 text-right">Volume</th>
                <th className="px-4 py-3 text-right">Aggr. Commission</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-bold text-white">{tx.reference}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{tx.correlationId}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-white font-bold">{tx.agentName || tx.merchantName}</div>
                    <div className="text-[10px] text-slate-400">
                      {tx.territoryName} • {tx.customerName}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-white/5 text-teal-300 border border-white/5">
                      {tx.type} • {tx.channel.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-400">
                    {formatCurrency(tx.aggregatorCommission)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        tx.status === "SUCCESSFUL"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : tx.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => openTransactionInvestigation(tx)}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/20"
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
