"use client";

import React, { useState } from "react";
import { useCountry } from "../ui/CountryContext";
import {
  Calculator,
  Building2,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Coins,
} from "lucide-react";

export const AgentCalculator: React.FC = () => {
  const { openModal, country } = useCountry();
  const [dailyTxCount, setDailyTxCount] = useState<number>(60);
  const [avgTicket, setAvgTicket] = useState<number>(15000);
  const [currencyMode, setCurrencyMode] = useState<"NGN" | "XOF">(
    country === "niger" ? "XOF" : "NGN"
  );

  const currencySymbol = currencyMode === "NGN" ? "₦" : "CFA ";

  // Commission calculation model based on standard tier-1 fintech agency economics:
  // Average commission per transaction is ~0.65% with fee caps
  const commissionRate = 0.006;
  const billCommissionFixed = currencyMode === "NGN" ? 40 : 50; // per bill

  const dailyVolume = dailyTxCount * avgTicket;
  const monthlyVolume = dailyVolume * 30;

  // Estimated gross monthly commission
  const monthlyCommission = Math.round(monthlyVolume * commissionRate + dailyTxCount * 30 * 0.25 * billCommissionFixed);
  const annualCommission = monthlyCommission * 12;

  const formatMoney = (val: number) => {
    return val.toLocaleString("en-US");
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#0d162a] border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Agency Banking Revenue & Commission Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Estimate your monthly earnings as a verified KoriePay banking agent
            </p>
          </div>
        </div>

        {/* Currency Switcher for Calculator */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs">
          <button
            onClick={() => setCurrencyMode("NGN")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              currencyMode === "NGN"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇳🇬 NGN (₦)
          </button>
          <button
            onClick={() => setCurrencyMode("XOF")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              currencyMode === "XOF"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇳🇪 XOF (CFA)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Sliders on Left */}
        <div className="lg:col-span-7 space-y-6">
          {/* Slider 1: Daily Transactions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Daily Customer Transactions
              </label>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 font-mono text-sm font-bold text-emerald-400 border border-white/5">
                {dailyTxCount} tx / day
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={dailyTxCount}
              onChange={(e) => setDailyTxCount(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>10 (Starter)</span>
              <span>150 (Busy Market Store)</span>
              <span>300 (Major Transport Hub)</span>
            </div>
          </div>

          {/* Slider 2: Average Ticket Size */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Average Transaction Ticket Size
              </label>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 font-mono text-sm font-bold text-amber-400 border border-white/5">
                {currencySymbol}
                {formatMoney(avgTicket)}
              </span>
            </div>
            <input
              type="range"
              min={2000}
              max={100000}
              step={1000}
              value={avgTicket}
              onChange={(e) => setAvgTicket(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>{currencySymbol}2,000</span>
              <span>{currencySymbol}50,000</span>
              <span>{currencySymbol}100,000</span>
            </div>
          </div>

          {/* Estimated monthly volume summary */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Total Monthly Processed Volume</div>
              <div className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
                {currencySymbol}
                {formatMoney(monthlyVolume)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Monthly Transactions</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {(dailyTxCount * 30).toLocaleString()} tx
              </div>
            </div>
          </div>
        </div>

        {/* Results Card on Right */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-amber-950/30 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-1">
              Projected Agent Net Return
            </div>

            <div className="text-xs text-slate-300">Estimated Monthly Earnings:</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1 mb-1 text-gradient-korie">
              {currencySymbol}
              {formatMoney(monthlyCommission)}
            </div>
            <div className="text-xs text-slate-400 mb-4">
              Approx.{" "}
              <span className="text-amber-400 font-mono font-bold">
                {currencySymbol}
                {formatMoney(annualCommission)}
              </span>{" "}
              projected per year
            </div>

            <div className="space-y-2 py-3 border-t border-white/10 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Commission Settlement:</span>
                <span className="text-emerald-400 font-mono font-semibold">Real-Time Instant</span>
              </div>
              <div className="flex justify-between">
                <span>POS Hardware Payback:</span>
                <span className="text-white font-mono font-semibold">&lt; 14 Days</span>
              </div>
              <div className="flex justify-between">
                <span>Float Overdraft Support:</span>
                <span className="text-amber-400 font-mono font-semibold">Eligible</span>
              </div>
            </div>

            <button
              onClick={() => openModal("agent")}
              className="w-full mt-4 py-3 rounded-xl btn-korie-primary text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Apply for KoriePay POS Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCalculator;
