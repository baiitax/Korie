"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useCustomer } from "../CustomerContext";
import { BalanceVisibilityToggle, maskedBalance } from "./BalanceVisibilityToggle";
import { BalanceCardSkeleton } from "./KoriePaySkeletons";
import { CustomerWallet } from "@/types/customer";
import { formatMoney, maskAccountNumber } from "@/lib/money";

/**
 * PrimaryBalanceCard — the hero of the portal (directive §9 / §11 / §12).
 *
 * Order is the requirement, not a style choice:
 *
 *     KORIEPAY ····························  XOF
 *     CFA 1,250,000                      ◉   ← dominant figure
 *     Available balance
 *     Account
 *     •••• 4821                              ← secondary, masked, always below
 *
 * Why each piece is what it is:
 *  • the figure uses `clamp()` so it stays the largest thing on any phone from
 *    320px up, with tabular numerals so two cards and the history list align;
 *  • `BalanceVisibilityToggle` sits inside this card, beside the figure — the
 *    single privacy control for the whole portal;
 *  • the account number is masked and typed smaller; §9 forbids it ever reading
 *    stronger than the balance (an unmasked number is also not screen-worthy);
 *  • XOF gets the brand-emerald field, NGN the same component in navy. Same
 *    architecture, different data — that is what §12 asks for, and it means a
 *    second account never looks like a lesser product;
 *  • no USD, ever: this component renders the wallet it is given and the portal
 *    only ever has XOF and NGN (currency list is server-ordered, XOF first).
 *
 * Surface comes from `.kp-balance-surface` (globals.css) — a flat two-stop
 * brand field and one hairline of logo geometry. The previous card had a
 * blurred white circle behind the text: a "glowing card", which §3 rules out
 * and which also cost a compositor layer on every scroll on low-end Android.
 */

interface Props {
  wallet: CustomerWallet;
  /** §46: while the portal request is in flight, show the shape of the card. */
  loading?: boolean;
  className?: string;
}

export const PrimaryBalanceCard: React.FC<Props> = ({ wallet, loading = false, className = "" }) => {
  const { t, isBalanceHidden, toggleHideBalance } = useCustomer();
  const [copied, setCopied] = useState(false);

  if (loading) return <BalanceCardSkeleton className={className} />;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(wallet.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* no clipboard permission — the number is on screen anyway */
    }
  };

  return (
    <div
      className={`kp-balance-surface relative flex flex-col justify-between overflow-hidden rounded-[26px] p-5 kp-on-vault shadow-[var(--shadow-md)] sm:p-6 ${className}`}
      data-currency={wallet.currency}
    >

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] kp-on-vault-soft">
            KoriePay
          </span>
          {wallet.isPrimary && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--kp-on-gold)]"
              style={{ background: "var(--brand-gold)" }}
            >
              {t("customer.vault.primary")}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-lg bg-white/18 px-2 py-0.5 font-mono text-[11px] font-extrabold tracking-wide">
          {wallet.currency}
        </span>
      </div>

      <div className="relative z-10 mt-4">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold kp-on-vault-soft">{t(CURRENCY_CAPTION_KEY[wallet.currency] ?? "customer.vault.accountGeneric")}</p>
            <p
              data-balance-figure={wallet.currency}
              className="mt-1 whitespace-nowrap font-extrabold tabular leading-none"
              style={{ fontSize: "clamp(1.75rem, 9vw, 2.5rem)" }}
            >
              {isBalanceHidden ? maskedBalance(wallet.symbol) : formatMoney(wallet.availableBalance, wallet.currency)}
            </p>
            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider kp-on-vault-soft">
              {t("customer.vault.available")}
            </p>
          </div>
          <BalanceVisibilityToggle tone="onBrand" hidden={isBalanceHidden} onToggle={toggleHideBalance} currencySymbol={wallet.symbol} />
        </div>
      </div>

      <div className="relative z-10 mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider kp-on-vault-soft">
            {t("customer.vault.accountNumber")}
          </p>
          <p data-account-number className="mt-1 font-mono text-[15px] font-semibold tracking-[0.08em] kp-on-vault">
            {maskAccountNumber(wallet.accountNumber)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 kp-on-vault-soft transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={t(copied ? "customer.accounts.copied" : "customer.accounts.copyNumber")}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};

const CURRENCY_CAPTION_KEY: Record<string, string> = {
  XOF: "customer.vault.captionXof",
  NGN: "customer.vault.captionNgn",
};

export default PrimaryBalanceCard;
