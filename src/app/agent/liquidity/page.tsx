"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  Coins,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default function AgentLiquidityPage() {
  const { liquidity, agent, t } = useAgent();
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepMessage, setSweepMessage] = useState<string | null>(null);

  const handleSweepFloat = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
      setSweepMessage("Float balance synchronized with Providus Bank settlement vault.");
      setTimeout(() => setSweepMessage(null), 3000);
    }, 1000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("common.liquidityCenter")}
            </h1>
            <p className="text-xs text-slate-400">
              Agent float management, cash thresholds and bank vault sweeping.
            </p>
          </div>
        </div>

        <button
          onClick={handleSweepFloat}
          disabled={isSweeping}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSweeping ? "animate-spin" : ""}`} />
          <span>Sync Float</span>
        </button>
      </div>

      {sweepMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{sweepMessage}</span>
        </div>
      )}

      {/* Float Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">Digital Wallet Float</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ₦{liquidity.walletFloat.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Providus Clearing Rail</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">Physical Cash In Hand</div>
          <div className="text-2xl font-extrabold text-white">
            ₦{liquidity.cashInHand.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Vault Physical Count</div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 to-[#090f1e] border border-amber-500/30 space-y-1">
          <div className="text-[10px] uppercase text-amber-400 font-bold">Total Liquidity</div>
          <div className="text-2xl font-extrabold text-white">
            ₦{liquidity.totalLiquidity.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 font-sans">● {liquidity.health} Status</div>
        </div>
      </div>

      {/* Dedicated Float Top-Up Account */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-3 shadow-xl text-xs">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
          Dedicated Float Top-Up Account
        </h2>
        <p className="text-slate-400">
          Transfer funds from any Nigerian bank to this dedicated NUBAN to instantly top up your agency wallet float.
        </p>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-between font-mono">
          <div>
            <div className="text-slate-400 text-[10px]">Providus Bank (Agent Float Sweeper)</div>
            <div className="text-base font-extrabold text-white mt-0.5">0123984123</div>
            <div className="text-slate-400 text-[11px] font-sans">
              KoriePay / {agent.businessName}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
            ● Real-Time Credit
          </span>
        </div>
      </div>
    </div>
  );
}
