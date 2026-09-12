"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  BarChart3,
  TrendingUp,
  Coins,
  Users,
  Store,
  MapPin,
  Calendar,
} from "lucide-react";

export default function AggregatorAnalyticsPage() {
  const { aggregator, territories, formatCurrency, t } = useAggregator();
  const [timeRange, setTimeRange] = useState("30D");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Network Financial Analytics</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Network volume trends, regional distribution, commission velocity, and node productivity metrics
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] text-xs font-mono">
          {["7D", "30D", "90D", "1Y"].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                timeRange === r ? "bg-teal-500 text-slate-950" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Gross Volume ({timeRange})</div>
          <div className="text-2xl font-black font-mono text-[var(--foreground)]">₦1,845,000,000</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+28.4% growth</div>
        </div>
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Network Transactions</div>
          <div className="text-2xl font-black font-mono text-[var(--foreground)]">114,820</div>
          <div className="text-[10px] text-teal-600 dark:text-teal-300 font-mono">99.4% Success Rate</div>
        </div>
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Aggregator Commission</div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">₦14,920,000</div>
          <div className="text-[10px] text-amber-300/80">0.8% Average Margin</div>
        </div>
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Active Network Nodes</div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">332 Nodes</div>
          <div className="text-[10px] text-[var(--foreground-muted)]">248 Agents • 84 Merchants</div>
        </div>
      </div>

      {/* Territory Analytics */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-5">
        <div>
          <h3 className="font-bold text-[var(--foreground)] text-base">Geographical Territory Contribution</h3>
          <p className="text-xs text-[var(--foreground-muted)]">Comparative revenue by geographical territory</p>
        </div>

        <div className="space-y-4">
          {territories.map((t) => (
            <div key={t.id} className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--foreground)] text-sm">{t.name}</div>
                  <div className="text-[11px] text-[var(--foreground-muted)]">
                    {t.stateOrRegion} • {t.activeAgentsCount} Agents • {t.activeMerchantsCount} Merchants
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(t.todayTPV)}
                  </div>
                  <div className="text-[10px] text-amber-300 font-mono">
                    Commission: {formatCurrency(t.aggregatorCommissionToday)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
