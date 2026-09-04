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
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Commission Distribution</h1>
        <p className="text-xs text-slate-400">
          Multi-tier commission earnings split across POS withdrawals, dynamic virtual transfers, and merchant acquiring
        </p>
      </div>

      {/* Commission Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Today's Earnings</div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {formatCurrency(commissions.todayEarned)}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold">+14.2% vs yesterday</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">This Month's Total</div>
          <div className="text-2xl font-black font-mono text-teal-300">
            {formatCurrency(commissions.thisMonthEarned)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Month-to-date yield</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Pending Clearance</div>
          <div className="text-2xl font-black font-mono text-slate-300">
            {formatCurrency(commissions.pendingClearance)}
          </div>
          <div className="text-[10px] text-slate-500">Clears at 23:59 EOD</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Settled to Providus</div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {formatCurrency(commissions.settledToBank)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Lifetime Bank Settlement</div>
        </div>
      </div>

      {/* Service Breakdown */}
      <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-5">
        <div>
          <h3 className="font-bold text-white text-base">Commission Yield by Payment Service</h3>
          <p className="text-xs text-slate-400">Volume and revenue contribution per payment rail</p>
        </div>

        <div className="space-y-4">
          {commissions.byService.map((srv, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white text-sm">{srv.serviceName}</span>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Volume: {formatCurrency(srv.volume)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-amber-400 text-sm">{formatCurrency(srv.commission)}</div>
                  <div className="text-[10px] text-teal-300 font-mono">{srv.percentage}% Share</div>
                </div>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-teal-400 h-full rounded-full" style={{ width: `${srv.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
