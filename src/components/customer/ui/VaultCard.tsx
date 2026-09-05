"use client";

import React, { useState } from "react";
import { useCustomer } from "../CustomerContext";
import { CustomerWallet } from "@/types/customer";
import { formatMoney, maskAccountNumber } from "@/lib/money";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

const ACCOUNT_CAPTION: Record<string, string> = {
  XOF: "West African CFA Franc Account",
  NGN: "Nigerian Naira Account",
};

/**
 * VaultCard — the premium hero account card, Niger-first (XOF primary).
 *
 * Information hierarchy (mandatory, directive §6/§7/§39):
 *   1. Account name (currency + caption)
 *   2. BALANCE — visually dominant, bold, tabular, high-contrast
 *   3. Account number — masked, BELOW the balance (never stronger than balance)
 *
 * The balance-visibility toggle lives BESIDE the balance (not in the top bar),
 * so there is exactly one privacy control and it belongs to the balance
 * context. XOF is presented first and is the primary account; NGN secondary.
 * No USD is ever rendered here.
 */
export const VaultCard: React.FC<{ wallet: CustomerWallet; className?: string }> = ({
  wallet,
  className = "",
}) => {
  const { isBalanceHidden, toggleHideBalance, t } = useCustomer();
  const [copied, setCopied] = useState(false);
  const caption = ACCOUNT_CAPTION[wallet.currency] ?? `${wallet.currency} Account`;
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

  // Bank-card-inspired vault surface: brand-teal for XOF (primary), deeper
  // brand for NGN (secondary). Clean, light-first, readable; no neon/glass.
  const gradient =
    wallet.currency === "XOF"
      ? "linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)"
      : "linear-gradient(135deg, #0f2f4f 0%, #124a6b 60%, #1d6fa5 100%)";

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 sm:p-6 md:p-7 text-white shadow-[var(--shadow-lg)] ${className}`}
      style={{ background: gradient }}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

      {/* Top: KoriePay monogram + currency — the product identity line */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur text-sm font-extrabold">
            K
          </div>
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90">
            KoriePay
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPrimary && (
            <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              {t("customer.vault.primary")}
            </span>
          )}
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold font-mono">
            {wallet.currency}
          </span>
        </div>
      </div>

      {/* Account caption */}
      <div className="relative z-10 mt-5 sm:mt-6">
        <div className="text-[12px] sm:text-[13px] font-semibold text-white/80">{caption}</div>
      </div>

      {/* BALANCE — dominant, above account number; toggle beside it */}
      <div className="relative z-10 mt-4 sm:mt-5">
        <div className="flex items-center justify-start gap-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/70">
            {t("customer.vault.available")}
          </div>
          <button
            onClick={toggleHideBalance}
            className="rounded-md p-1 text-white/80 transition-colors hover:text-white"
            aria-label={isBalanceHidden ? t("customer.accounts.showBalance") : t("customer.accounts.hideBalance")}
            aria-pressed={isBalanceHidden}
          >
            {isBalanceHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        <div
          className="mt-1 whitespace-nowrap font-extrabold font-mono tabular text-white"
          style={{ fontSize: "clamp(1.4rem, 6vw, 2.25rem)" }}
        >
          {isBalanceHidden ? "CFA ••••••••" : formatMoney(wallet.availableBalance, wallet.currency)}
        </div>
      </div>

      {/* Account number — masked, below the balance (never dominant) */}
      <div className="relative z-10 mt-5 sm:mt-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">
          {t("customer.vault.accountNumber")}
        </div>
        <div className="mt-1.5 flex items-center gap-2 min-w-0">
          <span
            className="whitespace-nowrap font-semibold font-mono text-white/95"
            style={{ fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)", letterSpacing: "0.06em" }}
          >
            {maskAccountNumber(wallet.accountNumber)}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            aria-label={t("customer.accounts.copyNumber")}
            title={t("customer.accounts.copyNumber")}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaultCard;
