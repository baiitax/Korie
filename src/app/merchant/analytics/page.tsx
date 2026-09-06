"use client";

import React, { useMemo, useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  ArrowUpRight,
  PieChart,
} from "lucide-react";

const RANGE_DAYS: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };

const CHANNEL_LABEL: Record<string, string> = {
  TRANSFER: "Bank Transfer (Virtual NUBAN)",
  POS: "Card POS Terminals",
  LINK: "Payment Links & Invoices",
  QR: "QR Standee Collections",
};

export default function MerchantAnalyticsPage() {
  const { merchant, formatCurrency, branches, transactions, t } = useMerchant();
  const [timeRange, setTimeRange] = useState("30D");

  const stats = useMemo(() => {
    const days = RANGE_DAYS[timeRange] || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const prevCutoff = Date.now() - days * 2 * 24 * 60 * 60 * 1000;

    const inRange = transactions.filter((tx) => new Date(tx.createdAt).getTime() >= cutoff);
    const prevRange = transactions.filter((tx) => {
      const t0 = new Date(tx.createdAt).getTime();
      return t0 >= prevCutoff && t0 < cutoff;
    });

    const successful = inRange.filter((tx) => tx.status === "SUCCESSFUL");
    const prevSuccessful = prevRange.filter((tx) => tx.status === "SUCCESSFUL");

    const grossVolume = successful.reduce((sum, tx) => sum + tx.amount, 0);
    const prevGrossVolume = prevSuccessful.reduce((sum, tx) => sum + tx.amount, 0);
    const growthPct = prevGrossVolume > 0 ? ((grossVolume - prevGrossVolume) / prevGrossVolume) * 100 : successful.length > 0 ? 100 : 0;

    const totalAttempted = inRange.length;
    const successRate = totalAttempted > 0 ? (successful.length / totalAttempted) * 100 : 0;
    const avgOrderValue = successful.length > 0 ? grossVolume / successful.length : 0;
    const netSettled = successful.reduce((sum, tx) => sum + tx.netAmount, 0);

    const channelTotals: Record<string, number> = {};
    for (const tx of successful) {
      const key = tx.channel || "TRANSFER";
      channelTotals[key] = (channelTotals[key] || 0) + tx.amount;
    }
    const channelBreakdown = Object.entries(channelTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([channel, volume]) => ({
        channel: CHANNEL_LABEL[channel] || channel,
        volume,
        percentage: grossVolume > 0 ? Math.round((volume / grossVolume) * 1000) / 10 : 0,
      }));

    return { grossVolume, growthPct, successfulCount: successful.length, successRate, avgOrderValue, netSettled, channelBreakdown };
  }, [transactions, timeRange]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Commerce Analytics</h1>
          <p className="text-xs text-slate-400">
            Real-time sales velocity, channel distribution, and branch performance KPIs computed from your own transactions.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 text-xs">
          {["7D", "30D", "90D", "1Y"].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-xl font-mono font-bold transition-colors ${
                timeRange === r ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Gross Volume ({timeRange})</div>
          <div className="text-2xl font-black font-mono text-white">{formatCurrency(stats.grossVolume)}</div>
          <div className={`text-[10px] font-semibold ${stats.growthPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {stats.growthPct >= 0 ? "+" : ""}
            {stats.growthPct.toFixed(1)}% vs previous period
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Successful Collections</div>
          <div className="text-2xl font-black font-mono text-white">{stats.successfulCount.toLocaleString()}</div>
          <div className="text-[10px] text-teal-400 font-semibold">{stats.successRate.toFixed(1)}% Success Rate</div>
        </div>
        <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Average Order Value</div>
          <div className="text-2xl font-black font-mono text-white">{formatCurrency(stats.avgOrderValue)}</div>
          <div className="text-[10px] text-slate-400 font-mono">Computed from real transactions</div>
        </div>
        <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Total Settled Net</div>
          <div className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(stats.netSettled)}</div>
          <div className="text-[10px] text-slate-400">Net after processing fees</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel Share */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
          <div>
            <h3 className="font-bold text-white text-base">Payment Channel Breakdown</h3>
            <p className="text-xs text-slate-400">Volume share across payment rails</p>
          </div>

          {stats.channelBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500">No successful collections yet in this period.</p>
          ) : (
            <div className="space-y-4">
              {stats.channelBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white font-medium">{item.channel}</span>
                    <span className="font-mono text-teal-400 font-bold">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 text-right">
                    {formatCurrency(item.volume)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Store Branch Ranking */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
          <div>
            <h3 className="font-bold text-white text-base">Store Branch Contribution</h3>
            <p className="text-xs text-slate-400">Comparative revenue by retail location</p>
          </div>

          {branches.length === 0 ? (
            <p className="text-xs text-slate-500">No branches added yet.</p>
          ) : (
            <div className="space-y-4">
              {branches.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{b.branchName}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.city}, {b.stateOrRegion}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400 text-sm">
                        {formatCurrency(b.todayGrossSales)}
                      </div>
                      <div className="text-[10px] text-teal-300 font-mono">Today's Total</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
