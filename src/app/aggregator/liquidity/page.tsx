"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Coins,
  Zap,
  Wallet,
  Building2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

export default function AggregatorLiquidityPage() {
  const {
    aggregator,
    agents,
    liquidity,
    formatCurrency,
    formatDate,
    openLiquidityModal,
    t,
  } = useAggregator();

  const lowFloatAgents = agents.filter((a) => a.walletBalance < 250000);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Network Liquidity & Float Command</h1>
          <p className="text-xs text-slate-400">
            Real-time monitoring of agency float balances, cash-in-drawer reserves, and automated liquidity rebalancing
          </p>
        </div>
        <button
          onClick={() => openLiquidityModal()}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Dispatch Float Injection</span>
        </button>
      </div>

      {/* Float Pools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Aggregator Main Float</div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {formatCurrency(liquidity.aggregatorMainWallet)}
          </div>
          <div className="text-[10px] text-teal-300 font-mono">Available for dispatch</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Distributed Agent Float</div>
          <div className="text-2xl font-black font-mono text-teal-300">
            {formatCurrency(liquidity.totalAgentFloatLiquidity)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Across {agents.length} active agents</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Network Drawer Cash</div>
          <div className="text-2xl font-black font-mono text-white">
            {formatCurrency(liquidity.estimatedCashInNetworkDrawer)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Physical cash-in reserves</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Float Health Status</div>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6" />
            <span>OPTIMAL</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {lowFloatAgents.length} nodes need top-up
          </div>
        </div>
      </div>

      {/* Underfunded Agency Nodes Attention List */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#060a16]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Agency Nodes Requiring Float Attention</h2>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold">
            {lowFloatAgents.length} Nodes Below Minimum Threshold (₦250k)
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {lowFloatAgents.map((agt) => (
            <div
              key={agt.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{agt.fullName}</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {agt.agentCode}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">• {agt.territoryName}</span>
                </div>
                <div className="text-xs text-slate-400">{agt.businessName} • {agt.phone}</div>
              </div>

              <div className="flex items-center gap-4 self-start sm:self-auto">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Current Float</div>
                  <div className="text-sm font-bold font-mono text-rose-400">{formatCurrency(agt.walletBalance)}</div>
                </div>

                <button
                  onClick={() => openLiquidityModal(agt.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Inject Float</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
