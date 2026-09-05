"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { CustomerTransaction } from "@/types/customer";
import { formatMoney } from "@/lib/money";
import TransactionStatusBadge, { transactionStatusLabelKey } from "./TransactionStatusBadge";

/**
 * TransactionRow — built for fast scanning (§12).
 *
 * Hierarchy, in order: amount (level 1) → counterparty + type (level 2) →
 * date + status (level 3). Masking follows the single balance-visibility
 * preference; status, currency and the reference are NEVER masked, because a
 * customer always needs to know what a row *is* even when they are hiding how
 * much it was (§47).
 */

const CATEGORY_ICON_KEY: Record<CustomerTransaction["category"], string> = {
  TRANSFERS: "OUT",
  BILLS: "OUT",
  FX: "SWAP",
  FUNDING: "IN",
  CARDS: "OUT",
};

function dayLabel(iso: string, lang: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = sameDay
    ? ""
    : d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short" });
  return [date, time].filter(Boolean).join(" • ");
}

/** "Transfer to A**** M****" — counterparty is masked at the name level. */
export function maskedCounterparty(tx: CustomerTransaction, fallback: string): string {
  const name = tx.recipientName || tx.senderName;
  if (!name) return fallback;
  if (tx.recipientName && tx.senderName) return name; // explicit party wins
  const parts = name.trim().split(/\s+/);
  const mask = (p: string) => (p.length <= 1 ? p : `${p[0]}${"•".repeat(Math.min(4, p.length - 1))}`);
  return parts.map(mask).join(" ");
}

export const TransactionRow: React.FC<{
  tx: CustomerTransaction;
  t: (key: string, params?: Record<string, string | number>) => string;
  isBalanceHidden: boolean;
  onToggleMask?: () => void;
  lang: string;
  /** Detail navigation target. Row is a link only when a detail exists. */
  href?: string;
  onOpen?: (tx: CustomerTransaction) => void;
  showMaskControl?: boolean;
}> = ({ tx, t, isBalanceHidden, onToggleMask, lang, href, onOpen, showMaskControl }) => {
  const sign = tx.direction === "OUTWARD" ? "−" : "+";
  const amount = `${sign} ${formatMoney(tx.amount, tx.currency)}`;
  const maskedAmount = `${sign} ${tx.currency === "XOF" ? "CFA" : "₦"} •••••••`;
  const title = maskedCounterparty(tx, tx.title);
  const isFx = CATEGORY_ICON_KEY[tx.category] === "SWAP";

  const inner = (
    <>
      <span
        className={`grid place-items-center h-9 w-9 rounded-xl shrink-0 border ${
          tx.direction === "OUTWARD"
            ? "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)]"
            : "bg-[var(--brand-soft)] border-[var(--brand-border)] text-[var(--brand-primary)]"
        }`}
        aria-hidden="true"
      >
        {isFx ? (
          <span className="text-[10px] font-mono font-bold">FX</span>
        ) : tx.direction === "OUTWARD" ? (
          <ArrowUpRight className="h-4 w-4" />
        ) : (
          <ArrowDownLeft className="h-4 w-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--foreground)]">{title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--foreground-muted)]">
          <span className="font-semibold">{t(`transactions.cat.${tx.category}`)}</span>
          <span aria-hidden="true">•</span>
          <span className="font-mono">{dayLabel(tx.createdAt, lang)}</span>
          <span aria-hidden="true">•</span>
          <span className="font-mono">{tx.currency}</span>
        </span>
      </span>

      <span className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`font-mono text-sm font-extrabold tabular-nums tracking-tight ${
            tx.direction === "OUTWARD" ? "text-[var(--foreground)]" : "text-[var(--brand-primary)]"
          }`}
        >
          {isBalanceHidden ? maskedAmount : amount}
        </span>
        <TransactionStatusBadge status={tx.status} t={t} />
      </span>
    </>
  );

  const cls =
    "w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] min-h-[64px]";

  return (
    <div className="group/row flex items-center border-b border-[var(--border)] last:border-b-0">
      {href ? (
        <Link href={href} className={cls} aria-label={`${title} — ${t(transactionStatusLabelKey(tx.status))}`}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={() => onOpen?.(tx)} className={cls}>
          {inner}
        </button>
      )}

      {/* One privacy control, placed with the money it governs (§45). */}
      {showMaskControl && onToggleMask && (
        <button
          type="button"
          onClick={onToggleMask}
          className="ml-1 mr-2 p-2 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
          aria-label={isBalanceHidden ? t("common.showAmounts") : t("common.hideAmounts")}
          aria-pressed={isBalanceHidden}
          title={isBalanceHidden ? t("common.showAmounts") : t("common.hideAmounts")}
        >
          {isBalanceHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}

      <ChevronRight className="h-4 w-4 mr-2 text-[var(--border-strong)] group-hover/row:text-[var(--foreground-muted)] transition-colors shrink-0" aria-hidden="true" />
    </div>
  );
};

export default TransactionRow;
