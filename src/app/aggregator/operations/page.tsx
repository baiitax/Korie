"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Activity,
  AlertOctagon,
  ShieldAlert,
  Coins,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";

export default function AggregatorOperationsPage() {
  const {
    transactions,
    exceptions,
    riskAlerts,
    liquidity,
    formatCurrency,
    formatDate,
    openLiquidityModal,
    openTransactionInvestigation,
    acknowledgeRiskAlert,
    resolveException,
    t,
  } = useAggregator();

  const [activeTab, setActiveTab] = useState<"stream" | "failed" | "exceptions" | "risk">("stream");
  const [filterSearch, setFilterSearch] = useState("");

  const failedTransactions = transactions.filter((tx) => tx.status === "FAILED");
  const openExceptions = exceptions.filter((e) => e.currentState !== "RESOLVED");
  const activeRiskAlerts = riskAlerts.filter((r) => r.status === "OPEN");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Live Operations Center</h1>
            <p className="text-xs text-slate-400">
              Real-time transaction telemetry, failed payment diagnostics, float warnings, and exception resolution
            </p>
          </div>
        </div>

        <button
          onClick={() => openLiquidityModal()}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Quick Float Injection</span>
        </button>
      </div>

      {/* Realtime Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("stream")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1 ${
            activeTab === "stream" ? "bg-[#0f1d38] border-teal-500" : "bg-[#091122] border-white/10"
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>Live Stream</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">{transactions.length} Active Events</div>
          <div className="text-[10px] text-teal-300 font-mono">Sub-second telemetry</div>
        </div>

        <div
          onClick={() => setActiveTab("failed")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1 ${
            activeTab === "failed" ? "bg-[#0f1d38] border-rose-500" : "bg-[#091122] border-white/10"
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed Transactions</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">{failedTransactions.length} Recorded</div>
          <div className="text-[10px] text-slate-400 font-mono">Auto-retry diagnostics</div>
        </div>

        <div
          onClick={() => setActiveTab("exceptions")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1 ${
            activeTab === "exceptions" ? "bg-[#0f1d38] border-amber-500" : "bg-[#091122] border-white/10"
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-amber-400 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Operational Exceptions</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">{openExceptions.length} Pending Action</div>
          <div className="text-[10px] text-slate-400 font-mono">Float & compliance queue</div>
        </div>

        <div
          onClick={() => setActiveTab("risk")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1 ${
            activeTab === "risk" ? "bg-[#0f1d38] border-purple-500" : "bg-[#091122] border-white/10"
          }`}
        >
          <div className="text-[10px] font-mono uppercase text-purple-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Risk Velocity Alerts</span>
          </div>
          <div className="text-xl font-bold font-mono text-purple-300">{activeRiskAlerts.length} Active Flags</div>
          <div className="text-[10px] text-slate-400 font-mono">Fraud pattern detector</div>
        </div>
      </div>

      {/* Main Operational Feed Table */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#060a16]">
          <h2 className="text-base font-bold text-white uppercase font-mono tracking-wider">
            {activeTab === "stream" && "All Realtime Network Events"}
            {activeTab === "failed" && "Failed & Interrupted Transactions"}
            {activeTab === "exceptions" && "Operational Exceptions Ledger"}
            {activeTab === "risk" && "Active Risk & Fraud Flags"}
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, agent, or entity..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Tab-specific Content */}
        {activeTab === "exceptions" ? (
          <div className="p-4 space-y-3">
            {exceptions.map((exc) => (
              <div
                key={exc.id}
                className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{exc.reference}</span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                        exc.severity === "HIGH"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {exc.severity} SEVERITY
                    </span>
                    <span className="text-slate-400 font-mono">• {exc.category}</span>
                  </div>
                  <div className="text-white font-medium">{exc.affectedEntity}</div>
                  <p className="text-slate-400 text-[11px]">{exc.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {exc.currentState === "RESOLVED" ? (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                      RESOLVED
                    </span>
                  ) : (
                    <button
                      onClick={() => resolveException(exc.id, "Manually verified & rebalanced float")}
                      className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                    >
                      Resolve Exception
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "risk" ? (
          <div className="p-4 space-y-3">
            {riskAlerts.map((ra) => (
              <div
                key={ra.id}
                className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-purple-300">{ra.alertType}</span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {ra.severity}
                    </span>
                  </div>
                  <div className="text-white font-bold">{ra.entityName}</div>
                  <p className="text-slate-400 text-[11px]">{ra.details}</p>
                  <div className="text-[10px] text-teal-400 font-mono">
                    Recommended: {ra.recommendedAction}
                  </div>
                </div>

                <div className="shrink-0">
                  {ra.status === "ACKNOWLEDGED" ? (
                    <span className="px-3 py-1 rounded-xl bg-white/5 text-slate-400 font-mono text-xs">
                      Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => acknowledgeRiskAlert(ra.id)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060a16] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Reference / Correlation</th>
                  <th className="px-4 py-3">Executing Entity</th>
                  <th className="px-4 py-3">Type & Channel</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {(activeTab === "failed" ? failedTransactions : transactions).map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-white">{tx.reference}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tx.correlationId}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-white font-bold">{tx.agentName || tx.merchantName}</div>
                      <div className="text-[10px] text-slate-400">{tx.territoryName}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-white/5 text-teal-300 border border-white/5">
                        {tx.type} • {tx.channel.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                      {formatCurrency(tx.amount)}
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
        )}
      </div>
    </div>
  );
}
