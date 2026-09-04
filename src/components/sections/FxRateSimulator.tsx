"use client";

import React, { useState } from "react";
import { useCountry } from "../ui/CountryContext";
import {
  Repeat2,
  ArrowRightLeft,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export const FxRateSimulator: React.FC = () => {
  const { openModal } = useCountry();
  const [direction, setDirection] = useState<"NGN_TO_XOF" | "XOF_TO_NGN">("NGN_TO_XOF");
  const [amount, setAmount] = useState<number>(500000);

  // Realistic corridor benchmark rate (illustrative benchmark rate: 1 XOF ≈ 2.45 NGN)
  const rateNgnToXof = 0.408; // 1000 NGN = 408 XOF
  const rateXofToNgn = 2.45; // 1000 XOF = 2450 NGN

  const convertedAmount =
    direction === "NGN_TO_XOF"
      ? Math.round(amount * rateNgnToXof)
      : Math.round(amount * rateXofToNgn);

  const toggleDirection = () => {
    setDirection(direction === "NGN_TO_XOF" ? "XOF_TO_NGN" : "NGN_TO_XOF");
    setAmount(convertedAmount);
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#0d162a] border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Repeat2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Institutional FX & Cross-Border Rate Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Simulate bilateral clearing between Nigeria (NGN) and Niger Republic (XOF CFA)
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs text-slate-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-Time Corridor Clearing</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Interactive Currency Converter Form */}
        <div className="lg:col-span-7 space-y-4">
          {/* Sending Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>You Send</span>
              <span className="font-mono">
                {direction === "NGN_TO_XOF" ? "🇳🇬 Nigeria" : "🇳🇪 Niger Republic"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-transparent text-xl sm:text-2xl font-mono font-bold text-white focus:outline-none"
              />
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 font-mono font-bold text-sm text-white shrink-0">
                {direction === "NGN_TO_XOF" ? "NGN ₦" : "XOF CFA"}
              </div>
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={toggleDirection}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-300 hover:text-white transition-all shadow-lg hover:scale-110"
              title="Reverse Corridor Direction"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Receiving Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>Recipient Receives (Estimated)</span>
              <span className="font-mono">
                {direction === "NGN_TO_XOF" ? "🇳🇪 Niger Republic" : "🇳🇬 Nigeria"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-xl sm:text-2xl font-mono font-bold text-gradient-korie">
                {convertedAmount.toLocaleString()}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 font-mono font-bold text-sm text-white shrink-0">
                {direction === "NGN_TO_XOF" ? "XOF CFA" : "NGN ₦"}
              </div>
            </div>
          </div>

          {/* Benchmark Rate Note */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Illustrative Corridor Benchmark:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {direction === "NGN_TO_XOF" ? "1,000 NGN ≈ 408 CFA" : "1,000 CFA ≈ 2,450 NGN"}
            </span>
          </div>
        </div>

        {/* Corridor Execution Details */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-white/10 shadow-xl space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
              Settlement Protocol Specs
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">Corridor Routing:</span>
                <span className="text-white font-mono font-semibold">Direct Inter-Bank Bridge</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">Execution Speed:</span>
                <span className="text-emerald-400 font-mono font-semibold">&lt; 3 Seconds</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">Treasury Rebalancing:</span>
                <span className="text-white font-mono font-semibold">Automated Daily T+0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Regulatory Model:</span>
                <span className="text-slate-200 font-mono font-semibold">Bilateral Central Bank Aligned</span>
              </div>
            </div>

            <button
              onClick={() => openModal("bdc")}
              className="w-full py-3 rounded-xl btn-korie-primary text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Onboard BDC / Treasury Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FxRateSimulator;
