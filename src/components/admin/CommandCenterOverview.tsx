"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "./AdminContext";
import {
  getExecutiveFinancialMetrics,
  BANKING_NODES,
  TRANSACTIONS,
  MAKER_CHECKER_REQUESTS,
  RECONCILIATION_EXCEPTIONS,
} from "@/services/adminDataService";
import {
  Layers,
  ArrowRightLeft,
  TrendingUp,
  ShieldAlert,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Coins,
  Building2,
  Users,
  Repeat2,
  CreditCard,
  Radio,
} from "lucide-react";
import Link from "next/link";

export const CommandCenterOverview: React.FC = () => {
  const { countryFilter, openDrawer, openMakerChecker } = useAdmin();
  const metrics = getExecutiveFinancialMetrics(countryFilter);
  const [livePulse, setLivePulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePulse((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 01: Top Intelligence & Anomaly Telemetry Strip */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0d162a] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                KORIEPAY INTELLIGENCE
              </span>
              <span className="text-xs text-slate-400">• Real-Time Anomaly Engine</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium">
              ✓ All primary banking nodes (Providus 🇳🇬 & Koris 🇳🇪) operational. 2 reconciliation items and 1 high-value FX swap require supervisor review.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/reconciliation"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/5 transition-colors"
          >
            Exceptions ({metrics.treasury.reconciliationExceptionsCount})
          </Link>
          <button
            onClick={() => openMakerChecker(MAKER_CHECKER_REQUESTS[0])}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-colors"
          >
            Review Queue ({metrics.treasury.makerCheckerQueueCount})
          </button>
        </div>
      </div>

      {/* 02: Core Banking Infrastructure Nodes Telemetry */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Core Financial Institution Nodes
            </h2>
          </div>
          <Link href="/admin/banking-nodes" className="text-xs text-emerald-400 hover:underline font-mono">
            Full Node Diagnostics →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BANKING_NODES.map((node) => (
            <div
              key={node.id}
              className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 hover:border-emerald-500/40 transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{node.country === "Nigeria" ? "🇳🇬" : node.country === "Niger Republic" ? "🇳🇪" : "🌍"}</span>
                  <span>{node.name}</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● {node.health}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase">Latency</span>
                  <span className="text-emerald-400 font-bold">{node.latencyMs}ms</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase">Uptime 24h</span>
                  <span className="text-white font-bold">{node.uptime24h}%</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-slate-500 block text-[9px] uppercase">Success</span>
                  <span className="text-amber-400 font-bold">{node.successRate}%</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-white/5">
                <span>24h Cleared Volume:</span>
                <span className="text-white font-mono font-semibold">
                  {node.currency === "NGN" ? "₦" : "CFA "}
                  {(node.volume24h / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 03: Executive Financial Totals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Processed Volume (NGN) */}
        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Volume (Nigeria NGN)</span>
            <span className="text-xs text-emerald-400 font-mono font-bold">+14.8%</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ₦ {(metrics.volume.ngn / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Settled via Providus Bank NIP Gateway
          </div>
        </div>

        {/* Total Processed Volume (XOF CFA) */}
        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Volume (Niger XOF)</span>
            <span className="text-xs text-amber-400 font-mono font-bold">+18.2%</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {(metrics.volume.xof / 1000000).toFixed(2)}M CFA
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Settled via Coris Bank Sahel Rail
          </div>
        </div>

        {/* Success Rate & Execution Health */}
        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Success Rate SLA</span>
            <span className="text-emerald-400 font-mono font-bold">99.2% Target</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {metrics.volume.successRate}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {metrics.volume.successfulCount} successful • {metrics.volume.failedCount} failed
          </div>
        </div>

        {/* Available Liquidity Reserves */}
        <div className="p-5 rounded-2xl bg-[#0b1324] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Treasury Float Reserves</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ₦ 1.24B
          </div>
          <div className="text-[11px] text-amber-400 font-mono">
            + 890M CFA in Koris Liquidity Vault
          </div>
        </div>
      </div>

      {/* 04: Ecosystem Active Participants Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/admin/customers"
          className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-teal-500/30 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1">
            <Users className="w-4 h-4 text-teal-400" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
          </div>
          <div className="text-lg font-bold font-mono text-white">{metrics.entities.customers.toLocaleString()}</div>
          <div className="text-xs text-slate-400">Total Customers</div>
        </Link>

        <Link
          href="/admin/agents"
          className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-emerald-500/30 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-lg font-bold font-mono text-white">{metrics.entities.agents.toLocaleString()}</div>
          <div className="text-xs text-slate-400">Active Agents (POS)</div>
        </Link>

        <Link
          href="/admin/merchants"
          className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-orange-500/30 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1">
            <CreditCard className="w-4 h-4 text-orange-400" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 transition-colors" />
          </div>
          <div className="text-lg font-bold font-mono text-white">{metrics.entities.merchants.toLocaleString()}</div>
          <div className="text-xs text-slate-400">Active Merchants</div>
        </Link>

        <Link
          href="/admin/bdc"
          className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-amber-500/30 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1">
            <Repeat2 className="w-4 h-4 text-amber-400" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="text-lg font-bold font-mono text-white">{metrics.entities.bdcs.toLocaleString()}</div>
          <div className="text-xs text-slate-400">BDC Operators</div>
        </Link>
      </div>

      {/* 05: Live Transactions Control Center Feed */}
      <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Live Ecosystem Transactions Feed
            </h3>
          </div>
          <Link
            href="/admin/transactions"
            className="text-xs text-emerald-400 hover:underline font-mono"
          >
            View All Transactions →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 border-b border-white/5">
                <th className="pb-3 font-semibold">Reference</th>
                <th className="pb-3 font-semibold">Market</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Sender / Recipient</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Gateway</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TRANSACTIONS.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => openDrawer("TRANSACTION", tx)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 font-mono text-white font-semibold group-hover:text-emerald-400">
                    {tx.reference}
                  </td>
                  <td className="py-3.5 font-mono">
                    {tx.countryCode === "NG" ? "🇳🇬 Nigeria" : "🇳🇪 Niger"}
                  </td>
                  <td className="py-3.5 text-slate-300">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-white/5">
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-300">
                    <div className="font-semibold text-white">{tx.sender.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">↳ {tx.recipient.name}</div>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-white">
                    {tx.currency === "NGN" ? "₦" : "CFA "}
                    {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                    {tx.provider.name}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        tx.status === "SUCCESSFUL"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : tx.status === "FAILED"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      ● {tx.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-mono text-[11px] text-emerald-400 group-hover:underline">
                    Inspect ↗
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommandCenterOverview;
