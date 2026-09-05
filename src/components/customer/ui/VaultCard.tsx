"use client";

import React, { useState } from "react";
import { useCustomer } from "../CustomerContext";
import { CustomerWallet } from "@/types/customer";
import { getCurrencyMeta, formatMoney } from "@/lib/money";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

/**
 * VaultCard — a simple, premium hero account card inspired by the reference
 * dashboard. One card per currency (horizontal snap-swap for the rest), fully
 * light-first and token-driven. Presents the account as a distinct NGN / XOF /
 * USD vault with a virtual tag, account holder, and available balance.
 *
 * Responsive: the bank info (virtual tag, account number) and the available
 * balance scale fluidly to the card width via clamp() so the card never
 * overflows or "shakes" on narrow (320px) phones; the holder + balance row
 * stacks on small screens instead of colliding.
 *
 * Only exposes data the backing account actually provides.
 */
export const VaultCard: React.FC<{ wallet: CustomerWallet; className?: string }> = ({
  wallet,
  className = "",
}) => {
  const { isBalanceHidden, toggleHideBalance, t } = useCustomer();
  const [copied, setCopied] = useState(false);
  const meta = getCurrencyMeta(wallet.currency);
  const isPrimary = wallet.isPrimary;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(wallet.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Bank-card-inspired vault: teal gradient by currency; NGN brand-teal, XOF amber-teal.
  const gradient =
    wallet.currency === "XOF"
      ? "linear-gradient(135deg, #0f5c51 0%, #0d7a6b 55%, #0d9488 100%)"
      : wallet.currency === "USD"
      ? "linear-gradient(135deg, #0f2f4f 0%, #124a6b 60%, #1d6fa5 100%)"
      : "linear-gradient(135deg, #071722 0%, #0a2a33 55%, #0d5b52 100%)";

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 sm:p-6 md:p-7 text-white shadow-[var(--shadow-lg)] ${className}`}
      style={{ background: gradient }}
    >
      {/* soft brand glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-white/5 blur-3xl" />

      {/* Top: monogram + vault label + PRIMARY */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur text-sm font-extrabold">
            K
          </div>
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90 truncate">
            {wallet.currency} {t("customer.accounts.title")}
          </div>
        </div>
        {isPrimary && (
          <span className="shrink-0 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
            {t("customer.vault.primary")}
          </span>
        )}
      </div>

      {/* Virtual account / tag */}
      <div className="relative z-10 mt-6 sm:mt-8">
        <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">
          {t("customer.vault.virtualTag")}
        </div>
        <div className="mt-2 flex items-center gap-2 min-w-0">
          <span
            className="whitespace-nowrap font-extrabold font-mono text-white"
            style={{ fontSize: "clamp(1rem, 4.4vw, 1.6rem)", letterSpacing: "clamp(0.04em, 0.4vw, 0.16em)" }}
          >
            {wallet.accountNumber.replace(/(.{3})/g, "$1 ").trim()}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            aria-label={t("customer.accounts.copyNumber")}
            title={t("customer.accounts.copyNumber")}
          >
            {copied ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </button>
        </div>
      </div>

      {/* Account holder + available balance — stacks on narrow screens */}
      <div className="relative z-10 mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">
            {t("customer.vault.accountHolder")}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-white/90">{wallet.accountName}</div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="flex items-center justify-start sm:justify-end gap-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">
              {t("customer.vault.available")}
            </div>
            <button
              onClick={toggleHideBalance}
              className="rounded-md p-1 text-white/70 transition-colors hover:text-white"
              aria-label={isBalanceHidden ? t("customer.accounts.showBalance") : t("customer.accounts.hideBalance")}
            >
              {isBalanceHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div
            className="mt-1 whitespace-nowrap font-extrabold font-mono tabular text-white"
            style={{ fontSize: "clamp(1rem, 4.8vw, 1.5rem)" }}
          >
            {isBalanceHidden ? "••••••••" : formatMoney(wallet.availableBalance, wallet.currency)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultCard;
