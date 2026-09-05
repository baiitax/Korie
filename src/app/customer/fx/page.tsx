"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { FX_RATES } from "@/services/customerDataService";
import { formatMoney } from "@/lib/money";
import { CustomerCurrency } from "@/types/customer";
import { ArrowLeft, Repeat2, Clock, ShieldCheck, Zap } from "lucide-react";

export default function CustomerFxPage() {
  const { t, fxRates } = useCustomer();
  const [fromCurrency, setFromCurrency] = useState<CustomerCurrency>("XOF");
  const [toCurrency, setToCurrency] = useState<CustomerCurrency>("NGN");
  const [fromAmount, setFromAmount] = useState<string>("500");
  const [countdown, setCountdown] = useState<number>(60);
  const [swappedResult, setSwappedResult] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCountdown((p) => (p <= 1 ? 60 : p - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Prefer the engine's real execution rate (single source of truth); fall back
  // to the catalog quote only for pairs the engine does not serve (e.g. USD).
  const engineQuote = fxRates.find((r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency);
  const catalogQuote =
    FX_RATES.find((r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency) || FX_RATES[0];
  const currentQuote = engineQuote
    ? { ...engineQuote, midRate: engineQuote.rate, buyRate: engineQuote.rate, sellRate: engineQuote.rate, spreadPercent: 0 }
    : catalogQuote;

  const parsedFromAmount = parseFloat(fromAmount) || 0;
  const rate = currentQuote.midRate;
  // 0.5% cross-border fee matches the amount the transfer engine applies.
  const fee = parsedFromAmount * 0.005;
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
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("fx.title")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("fx.subtitle")}</p>
        </div>
      </div>

      {swappedResult ? (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--brand-border)] p-8 text-center space-y-5 shadow-[var(--shadow-card)] animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("fx.quoteReady")}</h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              {t("fx.quoteReadyDesc", { fromAmount: swappedResult.from, toAmount: swappedResult.to })}
            </p>
          </div>
          <Link
            href="/customer/send-money"
            className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
          >
            {t("fx.proceedToSend")}
          </Link>
          <button
            onClick={() => setSwappedResult(null)}
            className="w-full py-3.5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-bold text-xs transition-colors"
          >
            {t("fx.executeAnother")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleExecuteSwap} className="space-y-5">
          {/* Rate Lock Timer Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-xs text-[var(--brand-deep)]">
            <div className="flex items-center gap-2 font-mono">
              <Zap className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>1 {fromCurrency} = {rate} {toCurrency}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--brand-primary)]">
              <Clock className="w-3.5 h-3.5" />
              <span>{t("fx.rateExpiresIn", { secs: countdown })}</span>
            </div>
          </div>

          {/* From Currency Block */}
          <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
              <span>{t("fx.convertFrom")}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="number" min="1" required value={fromAmount} onChange={(e) => setFromAmount(e.target.value)}
                className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-extrabold text-[var(--foreground)] focus:outline-none placeholder:text-[var(--text-disabled)]"
                placeholder="0.00"
              />
              <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value as CustomerCurrency)}
                className="px-3 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-mono font-bold text-xs focus:outline-none">
                <option value="XOF">CFA XOF</option>
                <option value="NGN">₦ NGN</option>
              </select>
            </div>
          </div>

          {/* Swap Currency Invert Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button type="button" onClick={handleSwapCurrencies}
              className="p-3 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white shadow-[var(--shadow-md)] transition-transform active:rotate-180 duration-200"
              title={t("fx.swapCurrencies")}>
              <Repeat2 className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* To Currency Block */}
          <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
              <span>{t("fx.convertTo")}</span>
              <span className="font-mono text-[var(--brand-primary)] font-bold">{t("fx.estimated")}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="w-full text-2xl sm:text-3xl font-mono font-extrabold text-[var(--brand-primary)] truncate tabular">
                {estimatedToAmount.toLocaleString("en-US", { maximumFractionDigits: toCurrency === "XOF" ? 0 : 2 })}
              </div>
              <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value as CustomerCurrency)}
                className="px-3 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-mono font-bold text-xs focus:outline-none">
                <option value="XOF">CFA XOF</option>
                <option value="NGN">₦ NGN</option>
              </select>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[var(--foreground-muted)]">
              <span>{t("fx.exchangeFee")}</span>
              <span className="font-mono text-[var(--foreground)]">{formatMoney(fee, fromCurrency)}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--foreground-muted)]">
              <span>{t("fx.spreadProvider")}</span>
              <span className="font-mono text-[var(--foreground)]">{currentQuote.source}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)] pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("fx.rateGuaranteed")}</span>
            </div>
          </div>

          <button type="submit" disabled={parsedFromAmount <= 0}
            className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-extrabold text-sm transition-all shadow-[var(--shadow-md)] disabled:opacity-50">
            {t("fx.instantSwapBtn")}
          </button>
        </form>
      )}
    </div>
  );
}
