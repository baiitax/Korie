"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "../AgentContext";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Wallet,
  Building2,
} from "lucide-react";

export const AgentLiquidityCard: React.FC = () => {
  const {
    agent,
    liquidity,
    isBalanceHidden,
    isLiquidityLoading,
    openReconciliation,
    t,
  } = useAgent();

  const isLowCash = liquidity.health === "LOW" || liquidity.cashInHand < liquidity.cashThresholdMin;

  // Renders a neutral skeleton instead of any number (including the pre-fetch
  // placeholder state) until the real ledger balance has been confirmed by
  // the backend. Never show a plausible-looking figure that isn't real.
  const renderAmount = (formatted: string) =>
    isLiquidityLoading ? (
      <span className="inline-block h-[1em] w-24 rounded bg-white/10 animate-pulse align-middle" />
    ) : isBalanceHidden ? (
      <span className="tracking-widest">••••••••••</span>
    ) : (
      formatted
    );

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e172e] via-[#091122] to-[#060a15] border border-white/15 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Top Status & Terminal Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t("common.agentStatus")}</span>
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Terminal: {agent.terminalId}
          </span>
        </div>

        <div className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
          <Coins className="w-4 h-4" />
          <span>Commission Today: ₦{agent.commissionBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Total Available Liquidity Hero */}
      <div className="mt-5 space-y-1 relative z-10">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
          {t("common.availableLiquidity")}
        </div>
        <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-mono tracking-tight">
          {renderAmount(`₦${liquidity.totalLiquidity.toLocaleString()}`)}
        </div>
      </div>

      {/* Dual Float Breakdown Strip: Cash-in-Hand vs Wallet Float */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
        {/* Physical Cash in Hand */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">
                {t("common.cashInHand")}
              </div>
              <div className="text-base sm:text-lg font-mono font-extrabold text-white">
                {renderAmount(`₦${liquidity.cashInHand.toLocaleString()}`)}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold ${isLowCash ? "text-amber-400" : "text-emerald-400"}`}>
            ● {isLowCash ? "LOW" : "OK"}
          </span>
        </div>

        {/* Digital Wallet Float */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">
                {t("common.walletFloat")}
              </div>
              <div className="text-base sm:text-lg font-mono font-extrabold text-white">
                {renderAmount(`₦${liquidity.walletFloat.toLocaleString()}`)}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">● Providus Rail</span>
        </div>
      </div>

      {/* Low Cash Liquidity Warning Banner */}
      {isLowCash && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2.5 relative z-10">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {t("common.lowCashWarning")}: Physical cash below ₦{liquidity.cashThresholdMin.toLocaleString()}. Please balance cash position.
          </span>
        </div>
      )}

      {/* Quick Action Grid (48px+ touch targets) */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 relative z-10">
        <Link
          href="/agent/cash-in"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 min-h-[56px]"
        >
          <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="text-xs mt-1 text-center font-extrabold">
            {t("common.cashIn")}
          </span>
        </Link>

        <Link
          href="/agent/cash-out"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 min-h-[56px]"
        >
          <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          <span className="text-xs mt-1 text-center font-extrabold">
            {t("common.cashOut")}
          </span>
        </Link>

        <Link
          href="/agent/transfer"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold transition-all active:scale-95 min-h-[56px]"
        >
          <ArrowRightLeft className="w-5 h-5 text-teal-400 stroke-[2.5]" />
          <span className="text-xs mt-1 text-center font-bold">
            {t("common.sendTransfer")}
          </span>
        </Link>

        <button
          onClick={openReconciliation}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold transition-all active:scale-95 min-h-[56px]"
        >
          <FileSpreadsheet className="w-5 h-5 text-blue-400 stroke-[2.5]" />
          <span className="text-xs mt-1 text-center font-bold">
            {t("common.reconciliation")}
          </span>
        </button>
      </div>
    </div>
  );
};

export default AgentLiquidityCard;
