"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useCustomer } from "../CustomerContext";

/**
 * BalanceVisibilityToggle — the portal's single privacy control (directive §13).
 *
 * Two rules this component exists to enforce, both of which were violated by the
 * code it replaces:
 *
 *   1. **One control, and it lives beside the money.** The header used to carry a
 *      second eye icon, so a customer had two buttons for one preference and no
 *      way to tell which was authoritative. The header now shows nothing; every
 *      balance in this portal renders this component next to its figure.
 *   2. **`HIDDEN` must be a real state, not a string.** Callers render dots in
 *      their own currency. A hard-coded "CFA ••••••••" inside an NGN card would
 *      tell the customer their naira balance is in francs — a fabricated number
 *      in a privacy mask is still a fabricated number.
 *
 * The preference itself is shared (`useCustomer().isBalanceHidden`) so hiding on
 * Home hides in History, Accounts and the transfer review, which is what
 * "consistent across surfaces" means from the customer's side.
 */

interface Props {
  /** Optional override for render contexts without the customer provider (tests, storybook). */
  hidden?: boolean;
  onToggle?: () => void;
  currencySymbol?: string;
  /** `onBrand` = sits on the teal/navy balance surface; `plain` = on a card. */
  tone?: "onBrand" | "plain";
  size?: "sm" | "md";
  className?: string;
}

export const BalanceVisibilityToggle: React.FC<Props> = ({
  hidden,
  onToggle,
  currencySymbol,
  tone = "plain",
  size = "md",
  className = "",
}) => {
  const ctx = useCustomer();
  const isHidden = hidden ?? ctx.isBalanceHidden;
  const toggle = onToggle ?? ctx.toggleHideBalance;
  const t = ctx.t;

  const label = isHidden ? t("customer.accounts.showBalance") : t("customer.accounts.hideBalance");
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-[15px] w-[15px]" : "h-4 w-4";
  const toneClass =
    tone === "onBrand"
      ? "kp-on-vault hover:bg-white/15"
      : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isHidden}
      aria-label={label}
      title={label}
      className={`inline-grid shrink-0 place-items-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent ${box} ${
        tone === "onBrand" ? "border-white/25 bg-white/10" : "border-[var(--border)] bg-[var(--surface)]"
      } ${toneClass} ${className}`}
      data-currency-symbol={currencySymbol}
      data-balance-toggle
    >
      {isHidden ? <Eye className={icon} aria-hidden="true" /> : <EyeOff className={icon} aria-hidden="true" />}
      {/* Announced to assistive tech as pressed/unpressed; `aria-hidden` above
          keeps the icon itself out of the reading order. */}
      <span className="sr-only">
        {isHidden ? t("customer.accounts.balanceHidden") : t("customer.accounts.balanceVisible")}
      </span>
    </button>
  );
};

/** Dots in the currency the card is actually denominated in (§13). */
export function maskedBalance(symbol: string): string {
  return `${symbol} ••••••••`;
}

export default BalanceVisibilityToggle;
