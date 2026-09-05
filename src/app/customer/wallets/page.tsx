"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { formatMoney } from "@/lib/money";
import { KpaySectionLoader } from "@/components/loading";
import { DataEmptyState } from "@/components/customer/ui/CustomerStateViews";
import {
  ArrowLeft,
  ArrowUpRight,
  PlusCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";

/**
 * Accounts (§44, §45, §46).
 *
 * Hierarchy per the brief, strictly:
 *   CURRENCY → BALANCE → account number
 * with the balance typographically dominant and the number quiet beneath it.
 *
 * The privacy control lives INSIDE each account, beside the figure it masks.
 * There is deliberately no second global eye in the header — two controls for
 * one preference is how masks get accidentally left on (or off).
 *
 * Cards come from the account engine ordered XOF first, NGN second; USD is not
 * part of this list at all.
 */
export default function CustomerWalletsPage() {
  // `wallets` is already XOF-first (server orders it); never re-sort client-side.
  const { wallets, setActiveCurrency, isBalanceHidden, toggleHideBalance, t, portalPhase, refreshPortal } =
    useCustomer();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard blocked (insecure context / denied): no false "Copied" */
      setCopiedId(null);
    }
  };

  if (portalPhase === "loading" && wallets.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <KpaySectionLoader message={t("common.loading")} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors shrink-0"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight truncate">
              {t("customer.accounts.title")}
            </h1>
            <p className="text-xs text-[var(--foreground-muted)]">{t("customer.wallets.subtitle")}</p>
          </div>
        </div>
        {wallets.length > 0 && (
          <button
            type="button"
            onClick={toggleHideBalance}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors shrink-0 min-h-[36px]"
            aria-pressed={isBalanceHidden}
            aria-label={isBalanceHidden ? t("common.showAmounts") : t("common.hideAmounts")}
          >
            {isBalanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isBalanceHidden ? t("common.showAmounts") : t("common.hideAmounts")}</span>
          </button>
        )}
      </div>

      {wallets.length === 0 ? (
        <DataEmptyState
          title={t("customer.dashboard.noAccountTitle")}
          hint={t("customer.dashboard.noAccountHint")}
          action={{ label: t("common.tryAgain"), onClick: () => void refreshPortal() }}
        />
      ) : (
        <div className="space-y-4">
          {wallets.map((w) => (
            <article
              key={w.id}
              className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 space-y-4 shadow-[var(--shadow-card)]"
              aria-label={`${w.currency} ${t("customer.accounts.title")}`}
            >
              {/* Level 2: identity of the account */}
              <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold text-xs shrink-0">
                    {w.currency === "XOF" ? "CFA" : "₦"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--brand-primary)] font-bold">
                      {w.currency} {t("customer.wallets.accountWord")}
                    </div>
                    <div className="text-xs font-bold text-[var(--foreground)] truncate">{w.bankName}</div>
                  </div>
                </div>
                <span className="shrink-0 text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-full border border-[var(--brand-border)] text-[var(--brand-primary)] bg-[var(--brand-soft)]/50">
                  {w.status === "ACTIVE" ? t("customer.receive.active247") : w.status}
                </span>
              </header>

              {/* Level 1: the balance — with its own visibility control */}
              <div className="pt-1">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">
                      {t("dashboard.availableBalance")}
                    </div>
                    <div className="text-[28px] sm:text-[34px] leading-tight font-extrabold text-[var(--foreground)] font-mono tabular-nums break-all">
                      {isBalanceHidden ? `${w.symbol} •••••••` : formatMoney(w.availableBalance, w.currency)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleHideBalance}
                    className="p-2.5 -mb-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors shrink-0 min-h-[40px] min-w-[40px] grid place-items-center"
                    aria-pressed={isBalanceHidden}
                    aria-label={isBalanceHidden ? t("common.showAmounts") : t("common.hideAmounts")}
                    title={isBalanceHidden ? t("common.showAmounts") : t("common.hideAmounts")}
                  >
                    {isBalanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="mt-1.5 text-[11px] text-[var(--foreground-muted)] font-mono flex items-center gap-2 flex-wrap">
                  <span>
                    {t("customer.wallets.ledger")}: {isBalanceHidden ? "••••••" : formatMoney(w.ledgerBalance, w.currency)}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span className="text-[var(--brand-primary)]">
                    {t("customer.wallets.dailyLimit")}: {isBalanceHidden ? "••••" : formatMoney(w.dailyLimit, w.currency)}
                  </span>
                </div>
              </div>

              {/* Level 3: account number — deliberately quieter than the balance */}
              <div className="p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">
                    {t("customer.wallets.nubanIban")}
                  </div>
                  <div className="text-[13px] font-mono text-[var(--foreground-muted)]">
                    {isBalanceHidden ? `•••• ${w.accountNumber.slice(-4)}` : w.accountNumber}
                  </div>
                  <div className="text-[11px] text-[var(--foreground-muted)] truncate">{w.accountName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(w.accountNumber, w.id)}
                  className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors min-h-[36px] min-w-[36px] grid place-items-center"
                  aria-label={t("customer.receive.copyingAria")}
                >
                  {copiedId === w.id ? (
                    <Check className="w-4 h-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Level 4: secondary actions */}
              <div className="flex items-center gap-2 pt-0.5">
                <Link
                  href="/customer/send-money"
                  onClick={() => setActiveCurrency(w.currency)}
                  className="flex-1 py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs text-center transition-colors shadow-[var(--shadow-md)] min-h-[44px] inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" /> {t("customer.wallets.sendMoney")}
                </Link>
                <Link
                  href="/customer/receive-money"
                  className="flex-1 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold text-xs text-center border border-[var(--border)] transition-colors min-h-[44px] inline-flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" /> {t("customer.wallets.receiveFunds")}
                </Link>
                <Link
                  href="/customer/fund"
                  className="py-3 px-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold text-xs border border-[var(--border)] transition-colors min-h-[44px] inline-flex items-center justify-center"
                  aria-label={t("customer.fund.title")}
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
