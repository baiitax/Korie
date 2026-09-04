"use client";

import React, { useState } from "react";
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

export default function MerchantAnalyticsPage() {
  const { merchant, formatCurrency, branches, transactions, t } = useMerchant();
  const [timeRange, setTimeRange] = useState("30D");

  const channelBreakdown = [
    { channel: "Bank Transfer (Virtual NUBAN)", volume: 64200000, percentage: 68 },
    { channel: "Card POS Terminals", volume: 21500000, percentage: 23 },
    { channel: "Payment Links & Invoices", volume: 8300000, percentage: 9 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Commerce Analytics</h1>
          <p className="text-xs text-slate-400">
            Real-time sales velocity, channel distribution, peak transaction hours, and branch performance KPIs.
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
          <div className="text-2xl font-black font-mono text-white">₦94,000,000</div>
          <div className="text-[10px] text-emerald-400 font-semibold">+24.5% vs previous period</div>
        </div>
        <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Successful Collections</div>
          <div className="text-2xl font-black font-mono text-white">1,482</div>
          <div className="text-[10px] text-teal-400 font-semibold">99.8% Success SLA</div>
        </div>
        <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Average Order Value</div>
          <div className="text-2xl font-black font-mono text-white">₦63,427</div>
          <div className="text-[10px] text-slate-400 font-mono">B2B Wholesale Weighted</div>
        </div>
        <div className="p-5 rounded-3xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Total Settled to Bank</div>
          <div className="text-2xl font-black font-mono text-emerald-400">₦92,590,000</div>
          <div className="text-[10px] text-slate-400">Net after 1.5% fee</div>
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

          <div className="space-y-4">
            {channelBreakdown.map((item, idx) => (
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
        </div>

        {/* Store Branch Ranking */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
          <div>
            <h3 className="font-bold text-white text-base">Store Branch Contribution</h3>
            <p className="text-xs text-slate-400">Comparative revenue by retail location</p>
          </div>

          <div className="space-y-4">
            {branches.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{b.branchName}</div>
                    <div className="text-[11px] text-slate-400">
                      {b.city}, {b.state} • {b.posTerminalsCount} Terminals
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
        </div>
      </div>
    </div>
  );
}
