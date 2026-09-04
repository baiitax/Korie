"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Coins,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Check,
} from "lucide-react";

export default function MerchantWalletPage() {
  const { merchant, formatCurrency, formatDate, isBalanceHidden, t } = useMerchant();

  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState(true);
  const [sweepFrequency, setSweepFrequency] = useState("DAILY_EOD");

  const handleManualPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) return;

    setIsPayoutProcessing(true);
    setTimeout(() => {
      setIsPayoutProcessing(false);
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
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Wallet & Settlements</h1>
        <p className="text-xs text-slate-400">
          Automated end-of-day bank sweeps to Providus Bank, manual on-demand payouts, and reserves.
        </p>
      </div>

      {/* Grid: Wallet Cards & Manual Payout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Balances and Sweep Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase text-teal-400 font-bold">
                  Available Payout Balance
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">
                  {isBalanceHidden ? "••••••••" : formatCurrency(merchant.availableBalance)}
                </div>
              </div>
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 space-y-0.5 text-xs">
                <div className="text-slate-400 font-mono">Linked Settlement Account:</div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    {merchant.settlementBank} • {merchant.settlementAccountMasked}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5">
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Pending T+1 Batch</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {formatCurrency(merchant.pendingSettlement)}
                </div>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Collateral Reserve (0%)</div>
                <div className="text-lg font-bold font-mono text-slate-300 mt-0.5">{formatCurrency(0)}</div>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Settlement Tier</div>
                <div className="text-lg font-bold text-teal-400 mt-0.5">{merchant.tier}</div>
              </div>
            </div>
          </div>

          {/* Sweep Rules */}
          <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Automatic Bank Sweep Protocol</h3>
                <p className="text-xs text-slate-400">
                  Daily automated clearing via NIBSS Direct Credit to Providus Bank settlement account.
                </p>
              </div>
              <button
                onClick={() => setAutoSweepEnabled(!autoSweepEnabled)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  autoSweepEnabled ? "bg-teal-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div
                onClick={() => setSweepFrequency("DAILY_EOD")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  sweepFrequency === "DAILY_EOD"
                    ? "bg-teal-500/10 border-teal-500 text-white"
                    : "bg-slate-900 border-white/5 text-slate-400"
                }`}
              >
                <div className="font-bold text-xs text-white">End-of-Day Auto-Sweep (23:59 WAT)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Full net daily revenue automatically transferred with zero manual effort.
                </div>
              </div>

              <div
                onClick={() => setSweepFrequency("INSTANT_PER_TX")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  sweepFrequency === "INSTANT_PER_TX"
                    ? "bg-teal-500/10 border-teal-500 text-white"
                    : "bg-slate-900 border-white/5 text-slate-400"
                }`}
              >
                <div className="font-bold text-xs text-white">Instant Real-time Forwarding</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Each transaction is settled within 60 seconds of confirmation.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: On-Demand Manual Payout */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">On-Demand Instant Payout</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manually push funds to Providus settlement account without waiting for nightly batch.
              </p>
            </div>

            {payoutSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <Check className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="font-bold text-white text-sm">Payout Dispatched!</div>
                <div className="text-xs text-slate-300 font-mono">
                  Transferred to {merchant.settlementBank} • {merchant.settlementAccountMasked}
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualPayout} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Payout Amount ({merchant.currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400 font-bold">₦</span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1,000,000"
                      max={merchant.availableBalance}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Transfer Fee:</span>
                    <span className="text-white font-mono">₦0.00 (Tier-1 Free)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Settlement SLA:</span>
                    <span className="text-emerald-400 font-bold">Instant (NIP 30s)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPayoutProcessing || !payoutAmount}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{isPayoutProcessing ? "Processing via Providus Node..." : "Initiate Instant Payout"}</span>
                </button>
              </form>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Dual-authorized bank payout node with Providus API integration.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
