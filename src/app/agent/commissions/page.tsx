"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  computeCommissionBreakdown,
  computeCommissionForPeriod,
} from "@/services/agentDataService";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  Smartphone,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
} from "lucide-react";

const ICONS: Record<string, typeof ArrowUpRight> = {
  CASH_IN: ArrowDownLeft,
  CASH_OUT: ArrowUpRight,
  TRANSFER_NIP: ArrowRightLeft,
  TRANSFER_CROSS_BORDER: ArrowRightLeft,
  BILL_AIRTIME: Smartphone,
  BILL_DATA: Smartphone,
  BILL_ELECTRICITY: Zap,
  BILL_CABLE_TV: Zap,
};

const COLORS: Record<string, string> = {
  CASH_IN: "text-emerald-400",
  CASH_OUT: "text-amber-400",
  TRANSFER_NIP: "text-blue-400",
  TRANSFER_CROSS_BORDER: "text-blue-400",
  BILL_AIRTIME: "text-blue-400",
  BILL_DATA: "text-blue-400",
  BILL_ELECTRICITY: "text-yellow-400",
  BILL_CABLE_TV: "text-yellow-400",
};

export default function AgentCommissionsPage() {
  const { agent, transactions, liquidity, t } = useAgent();

  const currencySymbol = liquidity.currency === "XOF" ? "CFA" : "₦";

  const commissionBreakdown = useMemo(
    () => computeCommissionBreakdown(transactions),
    [transactions]
  );

  const todayCommission = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return transactions
      .filter((tx) => tx.status === "SUCCESSFUL" && tx.createdAt.slice(0, 10) === today)
      .reduce((sum, tx) => sum + tx.agentCommission, 0);
  }, [transactions]);

  const weeklyCommission = useMemo(() => computeCommissionForPeriod(transactions, 7), [transactions]);
  const monthlyCommission = useMemo(() => computeCommissionForPeriod(transactions, 30), [transactions]);

  const totalTransactionsCount = commissionBreakdown.reduce((sum, item) => sum + item.count, 0);

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

      {/* Hero Summary Cards — derived from the agent's live transaction feed */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 to-[#090f1e] border border-amber-500/30 space-y-1">
          <div className="text-[10px] uppercase text-amber-400 font-bold">
            {t("commissions.todayCommission")}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {currencySymbol}{todayCommission.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            Wallet balance ready for sweep: {currencySymbol}{agent.commissionBalance.toLocaleString()}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">
            {t("commissions.weeklyCommission")}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {currencySymbol}{weeklyCommission.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Trailing 7 days, computed from transactions</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">
            {t("commissions.monthlyCommission")}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {currencySymbol}{monthlyCommission.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Trailing 30 days, computed from transactions</div>
        </div>
      </div>

      {/* Commission Breakdown by Service — computed from real transaction feed */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
            Service Earnings Breakdown
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">{totalTransactionsCount} successful tx</span>
        </div>

        {commissionBreakdown.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No successful transactions yet — commission breakdown will populate as you process cash-in,
            cash-out, transfers and bill payments.
          </p>
        ) : (
          <div className="space-y-3">
            {commissionBreakdown.map((item) => {
              const Icon = ICONS[item.type] || Coins;
              const color = COLORS[item.type] || "text-slate-300";
              return (
                <div
                  key={item.type}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white font-sans">{item.service}</div>
                      <div className="text-[10px] text-slate-400">{item.count} Transactions Completed</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-emerald-400 text-sm">
                      +{currencySymbol}{item.earned.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">From live transaction feed</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
