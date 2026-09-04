"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  Coins,
  CheckCircle2,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

export default function AgentCommissionsPage() {
  const { agent, transactions, t } = useAgent();

  const commissionBreakdown = [
    { service: "Cash-Out (Withdrawals)", earned: 18500, count: 24, icon: ArrowUpRight, color: "text-amber-400" },
    { service: "Cash-In (Deposits)", earned: 14200, count: 18, icon: ArrowDownLeft, color: "text-emerald-400" },
    { service: "Electricity Token Vending", earned: 5400, count: 12, icon: Zap, color: "text-yellow-400" },
    { service: "Airtime & Data VTU", earned: 4400, count: 33, icon: Smartphone, color: "text-blue-400" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/agent"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("commissions.title")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("commissions.subtitle")}
          </p>
        </div>
      </div>

      {/* Hero Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 to-[#090f1e] border border-amber-500/30 space-y-1">
          <div className="text-[10px] uppercase text-amber-400 font-bold">
            {t("commissions.todayCommission")}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            ₦{agent.commissionBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Ready for daily midnight sweep</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">
            {t("commissions.weeklyCommission")}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            ₦184,200
          </div>
          <div className="text-[10px] text-emerald-400 font-sans">↑ 18.4% vs last week</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">
            {t("commissions.monthlyCommission")}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            ₦684,500
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Gross total this month</div>
        </div>
      </div>

      {/* Commission Breakdown by Service */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
          Service Earnings Breakdown
        </h2>

        <div className="space-y-3">
          {commissionBreakdown.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white font-sans">{item.service}</div>
                    <div className="text-[10px] text-slate-400">{item.count} Transactions Completed</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-emerald-400 text-sm">
                    +₦{item.earned.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">Settled via Providus Node</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automatic Settlement Notice */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>
          Commissions are automatically swept and settled into your primary Providus Bank agent account daily at 23:59 WAT.
        </span>
      </div>
    </div>
  );
}
