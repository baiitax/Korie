"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function AggregatorWalletPage() {
  const {
    aggregator,
    formatCurrency,
    formatDate,
    openLiquidityModal,
    isBalanceHidden,
    t,
  } = useAggregator();

  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mask = (val: string) => (isBalanceHidden ? "••••••••" : val);

  const handleManualSweep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPayoutSuccess(true);
      setTimeout(() => {
        setPayoutSuccess(false);
        setPayoutAmount("");
      }, 3000);
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Settlement & Operational Wallet</h1>
        <p className="text-xs text-slate-400">
          Supervise liquidity reserves, escrow balances, and trigger on-demand commission payouts to Providus Bank Nigeria
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Balances and Allocations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase text-amber-400 font-bold">
                  Aggregator Total Main Float
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">
                  {mask(formatCurrency(aggregator.walletBalance))}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 space-y-0.5 text-xs">
                <div className="text-slate-400 font-mono">Linked Corporate Settlement:</div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>{aggregator.settlementBank} • {aggregator.settlementAccountMasked}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5 text-xs">
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Available for Injection</div>
                <div className="text-base font-bold font-mono text-teal-300 mt-1">
                  {mask(formatCurrency(aggregator.availableLiquidity))}
                </div>
              </div>
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Network Escrow Hold</div>
                <div className="text-base font-bold font-mono text-slate-300 mt-1">
                  {mask(formatCurrency(aggregator.escrowBalance))}
                </div>
              </div>
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Settled This Month</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                  {mask(formatCurrency(aggregator.settledCommissionsThisMonth))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Agency Float Distribution Desk</h3>
              <p className="text-xs text-slate-400">Inject liquidity directly into any underfunded agency cash point.</p>
            </div>
            <button
              onClick={() => openLiquidityModal()}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 whitespace-nowrap"
            >
              Dispatch Agent Float
            </button>
          </div>
        </div>

        {/* Right Col: On-Demand Payout to Bank */}
        <div className="p-6 rounded-3xl bg-[#091122] border border-white/10 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base">On-Demand Commission Payout</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Push approved commissions directly to your corporate bank account instantly.
            </p>
          </div>

          {payoutSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-bold text-white text-sm">Payout Dispatched via NIP!</div>
              <div className="text-xs text-slate-300 font-mono">
                Transferred to {aggregator.settlementBank} • {aggregator.settlementAccountMasked}
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSweep} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Payout Amount ({aggregator.currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₦</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 2,000,000"
                    max={aggregator.availableLiquidity}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Transfer Fee:</span>
                  <span className="text-white font-mono">₦0.00 (Tier-1 Zero Fee)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>SLA Speed:</span>
                  <span className="text-emerald-400 font-bold">Instant Direct Credit</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !payoutAmount}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>{isProcessing ? "Pushing via Providus NIP..." : "Withdraw to Providus Bank"}</span>
              </button>
            </form>
          )}

          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Dual maker-checker authenticated corporate settlement node.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
