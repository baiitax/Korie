"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "../CustomerContext";
import { CustomerCurrency } from "@/types/customer";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Repeat2,
  ShieldCheck,
  PlusCircle,
  Building2,
} from "lucide-react";

export const BalanceCard: React.FC = () => {
  const {
    wallets,
    activeCurrency,
    setActiveCurrency,
    activeWallet,
    isBalanceHidden,
    toggleHideBalance,
    t,
  } = useCustomer();
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeWallet.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c162c] via-[#091122] to-[#060b17] border border-white/15 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Top Currency Switcher & Hide Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        {/* Multi-Currency Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
          {wallets.map((w) => {
            const isSelected = w.currency === activeCurrency;
            return (
              <button
                key={w.currency}
                onClick={() => setActiveCurrency(w.currency)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>{w.currency === "NGN" ? "🇳🇬 NGN" : w.currency === "XOF" ? "🇳🇪 XOF" : "🇺🇸 USD"}</span>
              </button>
            );
          })}
        </div>

        {/* Hide Balance Toggle */}
        <button
          onClick={toggleHideBalance}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-colors"
          title={isBalanceHidden ? t("common.showBalance") : t("common.hideBalance")}
        >
          {isBalanceHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline font-medium">
            {isBalanceHidden ? t("common.showBalance") : t("common.hideBalance")}
          </span>
        </button>
      </div>

      {/* Main Balance Display */}
      <div className="mt-5 space-y-1 relative z-10">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
          <span>{t("dashboard.availableBalance")}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            ● LIVE
          </span>
        </div>

        <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-2">
          {isBalanceHidden ? (
            <span className="tracking-widest">••••••••••</span>
          ) : (
            <>
              <span className="text-emerald-400 font-sans text-2xl sm:text-3xl">
                {activeWallet.symbol}
              </span>
              <span>
                {activeWallet.availableBalance.toLocaleString("en-US", {
                  minimumFractionDigits: activeWallet.currency === "XOF" ? 0 : 2,
                  maximumFractionDigits: activeWallet.currency === "XOF" ? 0 : 2,
                })}
              </span>
            </>
          )}
        </div>

        {/* Ledger Balance Preview */}
        {!isBalanceHidden && (
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2 pt-0.5">
            <span>{t("common.ledger")}: {activeWallet.symbol}{activeWallet.ledgerBalance.toLocaleString()}</span>
            <span>•</span>
            <span className="text-emerald-400/80">Daily Limit: {activeWallet.symbol}{activeWallet.dailyLimit.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Virtual Dedicated Account Strip */}
      <div className="mt-5 p-3 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{activeWallet.bankName}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <span>{activeWallet.accountNumber}</span>
              <span>•</span>
              <span className="truncate max-w-[140px] sm:max-w-none">{activeWallet.accountName}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-200 transition-colors"
        >
          {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedAccount ? t("common.copied") : t("common.copy")}</span>
        </button>
      </div>

      {/* Quick Action Grid */}
      <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3 relative z-10">
        {/* Send Money */}
        <Link
          href="/customer/send-money"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] sm:text-xs mt-1 leading-tight text-center">
            {t("dashboard.sendMoney")}
          </span>
        </Link>

        {/* Receive Money */}
        <Link
          href="/customer/receive-money"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold transition-all active:scale-95"
        >
          <ArrowDownLeft className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
          <span className="text-[11px] sm:text-xs mt-1 leading-tight text-center">
            {t("dashboard.receiveMoney")}
          </span>
        </Link>

        {/* Pay Bills */}
        <Link
          href="/customer/bills"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold transition-all active:scale-95"
        >
          <Zap className="w-5 h-5 text-amber-400 stroke-[2.5]" />
          <span className="text-[11px] sm:text-xs mt-1 leading-tight text-center">
            {t("dashboard.payBills")}
          </span>
        </Link>

        {/* FX Swap */}
        <Link
          href="/customer/fx"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold transition-all active:scale-95"
        >
          <Repeat2 className="w-5 h-5 text-teal-400 stroke-[2.5]" />
          <span className="text-[11px] sm:text-xs mt-1 leading-tight text-center">
            {t("dashboard.exchangeFx")}
          </span>
        </Link>
      </div>
    </div>
  );
};

export default BalanceCard;
