"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { formatMoney } from "@/lib/money";
import { ArrowLeft, Wallet, PlusCircle, Copy, Check, ArrowUpRight } from "lucide-react";

export default function CustomerWalletsPage() {
  const { wallets, setActiveCurrency, t } = useCustomer();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            {t("nav.wallet")}
          </h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("customer.wallets.subtitle")}</p>
        </div>
      </div>

      {/* Wallets Cards List */}
      <div className="space-y-4">
        {wallets.map((w) => (
          <div
            key={w.id}
            className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-4 shadow-[var(--shadow-card)]"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs">
                  {w.currency === "XOF" ? "CFA" : w.currency === "NGN" ? "₦" : w.currency}
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--foreground)]">{w.bankName}</div>
                  <div className="text-[10px] text-[var(--foreground-muted)] font-mono">
                    {w.currency} · {t("customer.wallets.primaryVault")}
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-soft)]">
                ● {t("customer.receive.active247")}
              </span>
            </div>

            {/* Balances */}
            <div className="space-y-1 pt-1">
              <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">
                {t("dashboard.availableBalance")}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] font-mono tabular">
                {formatMoney(w.availableBalance, w.currency)}
              </div>
              <div className="text-[11px] text-[var(--foreground-muted)] font-mono flex items-center gap-2 flex-wrap">
                <span>{t("customer.wallets.ledger")}: {formatMoney(w.ledgerBalance, w.currency)}</span>
                <span className="text-[var(--muted)]">•</span>
                <span className="text-[var(--brand-primary)]">{t("customer.wallets.dailyLimit")}: {formatMoney(w.dailyLimit, w.currency)}</span>
              </div>
            </div>

            {/* Virtual Account Strip */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">
                  {t("customer.wallets.nubanIban")}
                </div>
                <div className="text-sm font-mono font-bold text-[var(--foreground)]">
                  {w.accountNumber}
                </div>
                <div className="text-[11px] text-[var(--foreground-muted)] truncate">{w.accountName}</div>
              </div>

              <button
                onClick={() => handleCopy(w.accountNumber, w.id)}
                className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                title={t("customer.receive.copyingAria")}
              >
                {copiedId === w.id ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/customer/send-money"
                onClick={() => setActiveCurrency(w.currency)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs text-center transition-colors shadow-[var(--shadow-md)]"
              >
                <span className="inline-flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" /> {t("customer.wallets.sendMoney")}</span>
              </Link>
              <Link
                href="/customer/receive-money"
                className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--foreground)] font-semibold text-xs text-center border border-[var(--border)] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> {t("customer.wallets.receiveFunds")}</span>
              </Link>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
