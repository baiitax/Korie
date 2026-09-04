"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { FX_RATES, formatMoney } from "@/services/customerDataService";
import { CustomerCurrency } from "@/types/customer";
import {
  ArrowLeft,
  Repeat2,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function CustomerFxPage() {
  const { wallets, t } = useCustomer();
  const [fromCurrency, setFromCurrency] = useState<CustomerCurrency>("USD");
  const [toCurrency, setToCurrency] = useState<CustomerCurrency>("NGN");
  const [fromAmount, setFromAmount] = useState<string>("500");
  const [countdown, setCountdown] = useState<number>(60);
  const [isSuccess, setIsSuccess] = useState(false);
  const [swappedResult, setSwappedResult] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Countdown timer for rate locking
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Find relevant rate quote
  const currentQuote =
    FX_RATES.find((r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency) ||
    FX_RATES[0];

  const parsedFromAmount = parseFloat(fromAmount) || 0;
  const rate = currentQuote.midRate;
  const fee = parsedFromAmount * 0.005; // 0.5% fee
  const estimatedToAmount = parsedFromAmount * rate;

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleExecuteSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedFromAmount <= 0) return;

    setSwappedResult({
      from: formatMoney(parsedFromAmount, fromCurrency),
      to: formatMoney(estimatedToAmount, toCurrency),
    });
    setIsSuccess(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("fx.title")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("fx.subtitle")}
          </p>
        </div>
      </div>

      {isSuccess && swappedResult ? (
        <div className="rounded-3xl bg-[#091122] border border-emerald-500/30 p-8 text-center space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">
              {t("fx.swapSuccess")}
            </h2>
            <p className="text-xs text-slate-300">
              {t("fx.swapSuccessDesc", {
                fromAmount: swappedResult.from,
                toAmount: swappedResult.to,
              })}
            </p>
          </div>
          <button
            onClick={() => setIsSuccess(false)}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Execute Another Swap
          </button>
        </div>
      ) : (
        <form onSubmit={handleExecuteSwap} className="space-y-5">
          {/* Rate Lock Timer Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-950/40 border border-teal-500/20 text-xs text-teal-300">
            <div className="flex items-center gap-2 font-mono">
              <Zap className="w-4 h-4 text-teal-400" />
              <span>1 {fromCurrency} = {rate} {toCurrency}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-teal-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Rate expires in {countdown}s</span>
            </div>
          </div>

          {/* From Currency Block */}
          <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t("fx.convertFrom")}</span>
              <span className="font-mono">
                Source: {fromCurrency === "NGN" ? "Providus Vault" : "Foreign Vault"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                min="1"
                required
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-extrabold text-white focus:outline-none placeholder:text-slate-600"
                placeholder="0.00"
              />
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as CustomerCurrency)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="NGN">🇳🇬 NGN</option>
                <option value="XOF">🇳🇪 XOF</option>
                <option value="USD">🇺🇸 USD</option>
              </select>
            </div>
          </div>

          {/* Swap Currency Invert Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              type="button"
              onClick={handleSwapCurrencies}
              className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 transition-transform active:rotate-180 duration-200"
              title={t("fx.swapCurrencies")}
            >
              <Repeat2 className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* To Currency Block */}
          <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t("fx.convertTo")}</span>
              <span className="font-mono text-emerald-400 font-bold">Estimated</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="w-full text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400 truncate">
                {estimatedToAmount.toLocaleString("en-US", {
                  maximumFractionDigits: toCurrency === "XOF" ? 0 : 2,
                })}
              </div>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value as CustomerCurrency)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="NGN">🇳🇬 NGN</option>
                <option value="XOF">🇳🇪 XOF</option>
                <option value="USD">🇺🇸 USD</option>
              </select>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>{t("fx.exchangeFee")}</span>
              <span className="font-mono text-slate-200">{formatMoney(fee, fromCurrency)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Spread Provider</span>
              <span className="font-mono text-slate-300">{currentQuote.source}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={parsedFromAmount <= 0}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20"
          >
            {t("fx.instantSwapBtn")}
          </button>
        </form>
      )}
    </div>
  );
}
