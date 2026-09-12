"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  TrendingUp,
  Award,
  Users,
  Search,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function AgentPerformancePage() {
  const { agents, formatCurrency, t } = useAggregator();
  const [metricSort, setMetricSort] = useState<"volume" | "transactions" | "growth">("volume");

  const sortedAgents = [...agents].sort((a, b) => {
    if (metricSort === "volume") return b.todayVolume - a.todayVolume;
    if (metricSort === "transactions") return b.todayTransactionsCount - a.todayTransactionsCount;
    return b.successRate - a.successRate;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Agent Productivity & Network Rankings</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Measure agent transaction velocity, customer frequency, average ticket sizes, and commission yield
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] text-xs">
          <button
            onClick={() => setMetricSort("volume")}
            className={`px-3 py-1.5 rounded-xl font-mono font-bold transition-colors ${
              metricSort === "volume" ? "bg-teal-500 text-slate-950" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            By Volume (TPV)
          </button>
          <button
            onClick={() => setMetricSort("transactions")}
            className={`px-3 py-1.5 rounded-xl font-mono font-bold transition-colors ${
              metricSort === "transactions" ? "bg-teal-500 text-slate-950" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            By Tx Count
          </button>
          <button
            onClick={() => setMetricSort("growth")}
            className={`px-3 py-1.5 rounded-xl font-mono font-bold transition-colors ${
              metricSort === "growth" ? "bg-teal-500 text-slate-950" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            By Success SLA
          </button>
        </div>
      </div>

      {/* Top 3 Leaderboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedAgents.slice(0, 3).map((agt, idx) => (
          <div
            key={agt.id}
            className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/40 transition-all space-y-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-600 dark:text-amber-400 text-sm">
                  #{idx + 1}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--foreground)] text-sm">{agt.fullName}</h3>
                  <div className="text-[10px] text-teal-600 dark:text-teal-300 font-mono">{agt.agentCode}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {agt.successRate}% SLA
              </span>
            </div>

            <div className="p-3 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Today's Volume:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(agt.todayVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Transactions:</span>
                <span className="font-mono text-[var(--foreground)]">{agt.todayTransactionsCount} txs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Agent Commission:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">{formatCurrency(agt.todayCommission)}</span>
              </div>
            </div>

            <Link
              href={`/aggregator/agents/${agt.id}`}
              className="w-full py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-bold text-[var(--foreground)] flex items-center justify-center gap-1 transition-colors"
            >
              <span>Inspect Node Metrics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)] text-[var(--foreground-muted)] font-mono uppercase text-[10px] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Agent & Business</th>
                <th className="px-4 py-3">Territory</th>
                <th className="px-4 py-3 text-right">Today's TPV</th>
                <th className="px-4 py-3 text-center">Transactions</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-center">Success SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {sortedAgents.map((agt, idx) => (
                <tr key={agt.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">#{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-[var(--foreground)]">{agt.fullName}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">{agt.businessName}</div>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--foreground)]">{agt.territoryName}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(agt.todayVolume)}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-[var(--foreground)]">{agt.todayTransactionsCount}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(agt.todayCommission)}
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-teal-600 dark:text-teal-300 font-bold">{agt.successRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
