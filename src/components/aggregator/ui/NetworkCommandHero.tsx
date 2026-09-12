"use client";

import React from "react";
import { useAggregator } from "../AggregatorContext";
import {
  TrendingUp,
  Coins,
  Wallet,
  Users,
  ShieldCheck,
  Zap,
  Clock,
} from "lucide-react";

export const NetworkCommandHero: React.FC = () => {
  const {
    aggregator,
    liquidity,
    commissions,
    formatCurrency,
    isBalanceHidden,
    openLiquidityModal,
    t,
  } = useAggregator();

  const mask = (val: string) => (isBalanceHidden ? "••••••••" : val);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-7 shadow-[var(--shadow-card)] space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
              {t("common.todayTPV")}
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Network Live
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[var(--foreground)] font-mono tracking-tight mt-1">
            {mask(formatCurrency(aggregator.totalNetworkTPVToday))}
          </div>
        </div>

        {/* Aggregator Available Float Pool */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] self-start sm:self-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Aggregator Float Wallet</div>
            <div className="text-sm sm:text-base font-bold font-mono text-teal-600 dark:text-teal-300">
              {mask(formatCurrency(aggregator.availableLiquidity))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 relative z-10 border-t border-[var(--border)]">
        <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Today's Commission</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-amber-600 dark:text-amber-400">
            {mask(formatCurrency(commissions.todayEarned))}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)]">Cleared via daily settlement run</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Monthly Network TPV</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {mask(formatCurrency(aggregator.totalNetworkTPVMonth))}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)]">Month-to-date, all channels</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Active Network Nodes</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-[var(--foreground)]">
            {aggregator.activeAgentsCount} Agents • {aggregator.activeMerchantsCount} Merchants
          </div>
          <div className="text-[10px] text-teal-600 dark:text-teal-300 font-mono">
            {aggregator.inactiveAgentsCount + aggregator.inactiveMerchantsCount} inactive/pending
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Network Float Health</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {mask(formatCurrency(liquidity.totalAgentFloatLiquidity))}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)]">
            {liquidity.agentsUnderMinimumThresholdCount} node(s) under threshold
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10">
        <button
          onClick={() => openLiquidityModal()}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
        >
          <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
          <span>{t("common.rebalanceLiquidity")}</span>
        </button>

        <a
          href="/aggregator/agents"
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--foreground)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Supervise Agents ({aggregator.activeAgentsCount})</span>
        </a>

        <a
          href="/aggregator/operations"
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--foreground)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Real-time Operations Feed</span>
        </a>
      </div>
    </div>
  );
};

export default NetworkCommandHero;
