"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import BalanceCard from "@/components/customer/ui/BalanceCard";
import { formatMoney } from "@/services/customerDataService";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  CreditCard,
  Repeat2,
  ShieldCheck,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Smartphone,
  Flame,
  Radio,
  FileCheck2,
} from "lucide-react";

export default function CustomerDashboardPage() {
  const { customer, transactions, openReceipt, t } = useCustomer();

  // Get current hour for dynamic greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("dashboard.greetingMorning")
      : hour < 17
      ? t("dashboard.greetingAfternoon")
      : t("dashboard.greetingEvening");

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* 1. Header & Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
            {t("common.appName")} Digital Banking
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {greeting}, {customer.firstName} 👋
          </h1>
        </div>

        <Link
          href="/customer/kyc"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{customer.kycTier} Verified</span>
        </Link>
      </div>

      {/* 2. Primary Multi-Currency Balance Hero */}
      <BalanceCard />

      {/* 3. Important Contextual Alert */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-slate-900 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {t("dashboard.kycAlertTitle")}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {t("dashboard.kycAlertDesc")}
            </p>
          </div>
        </div>

        <Link
          href="/customer/kyc"
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-end sm:self-auto shrink-0"
        >
          <span>{t("dashboard.upgradeTier")}</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 4. Financial Services Shortcuts Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/customer/bills/airtime"
          className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Airtime & Data</div>
            <div className="text-[10px] text-slate-400">MTN, Airtel, Zamani</div>
          </div>
        </Link>

        <Link
          href="/customer/bills/electricity"
          className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Electricity DisCo</div>
            <div className="text-[10px] text-slate-400">Prepaid Token Vending</div>
          </div>
        </Link>

        <Link
          href="/customer/cards"
          className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Virtual Cards</div>
            <div className="text-[10px] text-slate-400">USD & NGN Shopping</div>
          </div>
        </Link>

        <Link
          href="/customer/fx"
          className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Repeat2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Bilateral FX</div>
            <div className="text-[10px] text-slate-400">NGN ⇄ XOF CFA</div>
          </div>
        </Link>
      </div>

      {/* 5. Recent Activity List */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              {t("dashboard.recentActivity")}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 text-slate-400">
              {transactions.length}
            </span>
          </div>

          <Link
            href="/customer/transactions"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>{t("common.viewAll")}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Transactions Items */}
        <div className="divide-y divide-white/5">
          {recentTransactions.map((tx) => {
            const isInward = tx.direction === "INWARD";
            const isSuccess = tx.status === "SUCCESSFUL";
            const isPending = tx.status === "PENDING" || tx.status === "PROCESSING";

            return (
              <div
                key={tx.id}
                onClick={() => openReceipt(tx)}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] -mx-2 px-2 rounded-2xl cursor-pointer transition-colors"
              >
                {/* Left Icon + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isInward
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 text-slate-300 border border-white/10"
                    }`}
                  >
                    {isInward ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {tx.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <span>{tx.recipientName || tx.senderName || tx.description}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">
                        {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Amount + Status */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-xs sm:text-sm font-extrabold font-mono ${
                      isInward ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {isInward ? "+" : "-"}
                    {formatMoney(tx.amount, tx.currency)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span
                      className={`text-[9px] font-mono font-bold uppercase ${
                        isSuccess
                          ? "text-emerald-400"
                          : isPending
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      ● {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
