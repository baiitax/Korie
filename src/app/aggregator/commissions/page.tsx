"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Coins,
  TrendingUp,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function AggregatorCommissionsPage() {
  const { commissions, formatCurrency, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Aggregator Commission Distribution</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Multi-tier commission earnings split across POS withdrawals, dynamic virtual transfers, and merchant acquiring
        </p>
      </div>

      {/* Commission Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Today's Earnings</div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(commissions.todayEarned)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+14.2% vs yesterday</div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">This Month's Total</div>
          <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-300">
            {formatCurrency(commissions.thisMonthEarned)}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)] font-mono">Month-to-date yield</div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Pending Clearance</div>
          <div className="text-2xl font-black font-mono text-[var(--foreground)]">
            {formatCurrency(commissions.pendingClearance)}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)]">Clears at 23:59 EOD</div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Settled to Providus</div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(commissions.settledToBank)}
          </div>
          <div className="text-[10px] text-[var(--foreground-muted)] font-mono">Lifetime Bank Settlement</div>
        </div>
      </div>

      {/* Service Breakdown */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-5">
        <div>
          <h3 className="font-bold text-[var(--foreground)] text-base">Commission Yield by Payment Service</h3>
          <p className="text-xs text-[var(--foreground-muted)]">Volume and revenue contribution per payment rail</p>
        </div>

        <div className="space-y-4">
          {commissions.byService.map((srv, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-[var(--foreground)] text-sm">{srv.serviceName}</span>
                  <div className="text-[11px] text-[var(--foreground-muted)] font-mono">
                    Volume: {formatCurrency(srv.volume)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{formatCurrency(srv.commission)}</div>
                  <div className="text-[10px] text-teal-600 dark:text-teal-300 font-mono">{srv.percentage}% Share</div>
                </div>
              </div>

              <div className="w-full bg-[var(--background)] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-teal-400 h-full rounded-full" style={{ width: `${srv.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
