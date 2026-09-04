"use client";

import React from "react";
import { useAggregator } from "../AggregatorContext";
import {
  TrendingUp,
  Coins,
  Wallet,
  Users,
  Store,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Building2,
} from "lucide-react";

export const NetworkCommandHero: React.FC = () => {
  const {
    aggregator,
    liquidity,
    formatCurrency,
    isBalanceHidden,
    openLiquidityModal,
    t,
  } = useAggregator();

  const mask = (val: string) => (isBalanceHidden ? "••••••••" : val);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c162c] via-[#091122] to-[#050914] border border-white/10 p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              {t("common.todayTPV")}
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Providus Settlement Node Live
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight mt-1">
            {mask(formatCurrency(aggregator.totalNetworkTPVToday))}
          </div>
        </div>

        {/* Aggregator Available Float Pool */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 self-start sm:self-auto backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Aggregator Float Wallet</div>
            <div className="text-sm sm:text-base font-bold font-mono text-teal-300">
              {mask(formatCurrency(aggregator.availableLiquidity))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 relative z-10 border-t border-white/10">
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Today's Commission</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-amber-400">
            {mask(formatCurrency(342150))}
          </div>
          <div className="text-[10px] text-slate-500">Auto-clears to Providus EOD</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monthly Network TPV</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-400">
            {mask(formatCurrency(aggregator.totalNetworkTPVMonth))}
          </div>
          <div className="text-[10px] text-emerald-400/80">+28.4% vs last month</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>Active Network Nodes</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-white">
            {aggregator.activeAgentsCount} Agents • {aggregator.activeMerchantsCount} Merchants
          </div>
          <div className="text-[10px] text-teal-300 font-mono">98.8% Network Uptime</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Network Float Health</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-400">
            {mask(formatCurrency(liquidity.totalAgentFloatLiquidity))}
          </div>
          <div className="text-[10px] text-slate-500">2 Nodes under threshold</div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10">
        <button
          onClick={() => openLiquidityModal()}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98]"
        >
          <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
          <span>{t("common.rebalanceLiquidity")}</span>
        </button>

        <a
          href="/aggregator/agents"
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Users className="w-4 h-4 text-teal-400" />
          <span>Supervise Agents ({aggregator.activeAgentsCount})</span>
        </a>

        <a
          href="/aggregator/operations"
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Real-time Operations Feed</span>
        </a>
      </div>
    </div>
  );
};

export default NetworkCommandHero;
