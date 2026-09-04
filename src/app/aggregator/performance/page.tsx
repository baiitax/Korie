"use client";

import React from "react";
import Link from "next/link";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  TrendingUp,
  Award,
  Users,
  Store,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function AggregatorPerformancePage() {
  const { agents, merchants, formatCurrency, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Network Productivity & Growth</h1>
        <p className="text-xs text-slate-400">
          Monitor agent node efficiency, merchant acquiring velocity, and regional growth metrics
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Agents */}
        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Top Performing Agents</h3>
            <Link href="/aggregator/agents/performance" className="text-xs font-bold text-teal-400">
              View Leaderboard
            </Link>
          </div>

          <div className="space-y-3">
            {agents.slice(0, 4).map((a) => (
              <div key={a.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs">{a.fullName}</div>
                  <div className="text-[10px] text-slate-400">{a.territoryName}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400 text-xs">{formatCurrency(a.todayVolume)}</div>
                  <div className="text-[10px] text-amber-300 font-mono">{formatCurrency(a.todayCommission)} Comm.</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Merchants */}
        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Top Acquired Merchants</h3>
            <Link href="/aggregator/merchants" className="text-xs font-bold text-teal-400">
              View All Merchants
            </Link>
          </div>

          <div className="space-y-3">
            {merchants.slice(0, 3).map((m) => (
              <div key={m.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs">{m.businessName}</div>
                  <div className="text-[10px] text-slate-400">{m.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400 text-xs">{formatCurrency(m.todayVolume)}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{m.todayTxCount} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
