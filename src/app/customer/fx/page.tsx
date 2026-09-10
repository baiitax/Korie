"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import AmountInput from "@/components/customer/ui/AmountInput";
import { FX_RATES } from "@/services/customerDataService";
import { formatMoney } from "@/lib/money";
import { CustomerCurrency } from "@/types/customer";
import { ArrowLeft, Repeat2, Clock, ShieldCheck, Zap, Loader2, AlertTriangle, Lock } from "lucide-react";

/**
 * BDC / FX Swap — real execution.
 *
 * What was wrong here: pressing "Instant Swap" never called a backend at
 * all. It computed a number client-side and showed a "quote ready" card
 * that linked to Send Money — no wallet was ever actually debited or
 * credited, and there was no tier-based volume restriction of any kind.
 *
 * Now: this posts to /api/customer/portal/fx/swap, which executes a real,
 * ledger-backed swap between the customer's own NGN and XOF wallets via
 * public.post_customer_fx_swap(), enforcing KYC-tier-based volume ceilings
 * grounded in CBN (NGN) and BCEAO (XOF) rules
 * (see src/lib/compliance/tierLimits.ts). A tier that has hit its ceiling,
 * or an unverified (Tier 0) customer, gets a specific, honest error instead
 * of a fabricated success screen.
 */
export default function CustomerFxPage() {
  const { t, fxRates, customer, executeFxSwap } = useCustomer();
  const [fromCurrency, setFromCurrency] = useState<CustomerCurrency>("XOF");
  const [toCurrency, setToCurrency] = useState<CustomerCurrency>("NGN");
  const [fromAmount, setFromAmount] = useState<string>("500");
  const [countdown, setCountdown] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<{ from: string; to: string; reference: string } | null>(null);

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
  // 0.5% platform fee — matches what /api/customer/portal/fx/swap actually charges.
  const fee = parsedFromAmount * 0.005;
  const estimatedToAmount = (parsedFromAmount - fee) * rate;

  const kycTier = customer?.kycTier || "TIER_1";

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleExecuteSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedFromAmount <= 0 || submitting) return;
    setSubmitting(true);
    setFormError(null);

    const result = await executeFxSwap({ fromCurrency, toCurrency, fromAmount: parsedFromAmount });

    setSubmitting(false);
    if (!result.success || !result.swap) {
      setFormError(result.error || t("fx.swapFailed"));
      return;
    }

    setSwapResult({
      from: formatMoney(result.swap.fromAmount, fromCurrency),
      to: formatMoney(result.swap.toAmount, toCurrency),
      reference: result.swap.reference || "",
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

      {/* Tier ceiling disclosure — the whole point of this feature's fix */}
      <div className="flex items-start gap-2 p-3 rounded-2xl bg-[var(--info-soft)] border border-[var(--info-soft)] text-[11px] text-[var(--info)]">
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{t("fx.tierLimitNotice", { tier: kycTier.replace("TIER_", "Tier ") })}</span>
      </div>

      {swapResult ? (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--brand-border)] p-8 text-center space-y-5 shadow-[var(--shadow-card)] animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("fx.swapComplete")}</h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              {t("fx.swapCompleteDesc", { fromAmount: swapResult.from, toAmount: swapResult.to })}
            </p>
            {swapResult.reference && (
              <p className="text-[10px] font-mono text-[var(--foreground-muted)]">{swapResult.reference}</p>
            )}
          </div>
          <Link
            href="/customer/wallets"
            className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
          >
            {t("fx.viewWallets")}
          </Link>
          <button
            onClick={() => setSwapResult(null)}
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
              <AmountInput
                value={fromAmount}
                onChange={setFromAmount}
                inputClassName="!py-0 bg-transparent !text-2xl sm:!text-3xl !font-extrabold border-none focus:ring-0 placeholder:text-[var(--text-disabled)]"
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
              className="p-3 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] shadow-[var(--shadow-md)] transition-transform active:rotate-180 duration-200"
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

          {formError && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-[var(--danger-soft)] border border-[var(--danger-soft)] text-[11px] text-[var(--danger)]" role="alert">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <button type="submit" disabled={parsedFromAmount <= 0 || submitting}
            className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-extrabold text-sm transition-all shadow-[var(--shadow-md)] disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? t("fx.processing") : t("fx.instantSwapBtn")}
          </button>
        </form>
      )}
    </div>
  );
}
