"use client";

import React from "react";
import { useCustomer } from "../CustomerContext";
import { getCurrencyMeta, formatMoney } from "@/lib/money";
import { Check, ChevronDown } from "lucide-react";

/**
 * AccountSwitcher — fast NGN / XOF (and USD) switching.
 *
 * Switching updates the active currency context so balances, transaction
 * lists, transfer forms, actions and charts all re-render without a reload.
 * The currently selected account is clearly marked.
 */
export const AccountSwitcher: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { wallets, activeCurrency, setActiveCurrency, isBalanceHidden, t } = useCustomer();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="tablist" aria-label={t("customer.accounts.switcherLabel")}>
      {wallets.map((w) => {
        const meta = getCurrencyMeta(w.currency);
        const isActive = w.currency === activeCurrency;
        return (
          <button
            key={w.currency}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveCurrency(w.currency)}
            className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-all ${
              isActive
                ? "border-[var(--brand-border)] bg-[var(--brand-soft)] shadow-[var(--shadow-sm)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand-border)]"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-3)] text-base">
              {meta.flag}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-[10px] font-bold uppercase tracking-wide ${
                  isActive ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
                }`}
              >
                {w.currency} Account
              </span>
              <span className="block font-mono text-sm font-bold tabular text-[var(--foreground)]">
                {isBalanceHidden ? "••••••••" : formatMoney(w.availableBalance, w.currency)}
              </span>
            </span>
            {isActive ? (
              <Check className="ml-1 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
            ) : (
              <ChevronDown className="ml-1 h-4 w-4 shrink-0 text-[var(--foreground-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AccountSwitcher;
