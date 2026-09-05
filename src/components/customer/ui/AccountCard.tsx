"use client";

import React, { useState } from "react";
import { useCustomer } from "../CustomerContext";
import { CustomerWallet } from "@/types/customer";
import { getCurrencyMeta, formatMoney, maskAccountNumber } from "@/lib/money";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Eye,
  EyeOff,
  Check,
  Copy,
  CreditCard,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";

/**
 * AccountCard — premium, bank-card-inspired financial account card.
 *
 * Presented as a distinct NGN / XOF / USD account (never as one interchangeable
 * balance). Light-first, token-driven; uses the existing KoriePay brand ladder
 * and a subtle inline micro-grid instead of a stock image. Only exposes the
 * data the backend actually provides; never invents card numbers/CVV/Visa.
 */

type AccountCardProps = {
  wallet: CustomerWallet;
  onOpen?: (wallet: CustomerWallet) => void;
  className?: string;
};

export const AccountCard: React.FC<AccountCardProps> = ({
  wallet,
  onOpen,
  className = "",
}) => {
  const { isBalanceHidden, t } = useCustomer();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = getCurrencyMeta(wallet.currency);
  const isPrimary = wallet.isPrimary;

  const visibleBalance = isBalanceHidden
    ? "••••••••"
    : formatMoney(wallet.availableBalance, wallet.currency);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(wallet.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  // Distinct brand tints per currency so NGN / XOF / USD read as separate accounts.
  const accentMap: Record<string, string> = {
    NGN: "var(--brand-primary)",
    XOF: "var(--brand-secondary)",
    USD: "var(--info)",
  };
  const accent = accentMap[wallet.currency] ?? "var(--brand-primary)";

  const statusMeta =
    wallet.status === "ACTIVE"
      ? { label: t("customer.accounts.active"), tone: "success" }
      : wallet.status === "RESTRICTED"
      ? { label: t("customer.accounts.restricted"), tone: "warning" }
      : { label: t("customer.accounts.frozen"), tone: "danger" };

  return (
    <article
      onClick={() => onOpen?.(wallet)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 sm:p-6 
        glass-03
        min-h-[220px] cursor-pointer
        transition-transform duration-300 ease-out hover:-translate-y-1
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2
        ${className}`}
      style={{ ["--accent" as string]: accent }}
      aria-label={`${t("customer.accounts.status")}: ${statusMeta.label}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(wallet);
        }
      }}
    >
      {/* Micro-grid / financial-network motif (subtle, brand-tinted) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
        aria-hidden="true"
        preserveAspectRatio="none"
        viewBox="0 0 400 240"
      >
        <defs>
          <pattern id={`grid-${wallet.id}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="240" fill={`url(#grid-${wallet.id})`} />
        <circle cx="330" cy="60" r="70" fill="currentColor" opacity="0.25" />
        <circle cx="60" cy="200" r="46" fill="currentColor" opacity="0.2" />
      </svg>

      {/* Accent glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl"
        style={{ background: accent, opacity: 0.12 }}
      />

      {/* Top row: brand + currency */}
      <div className="relative z-10 flex items-start justify-between">
        <span className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">
          KoriePay
        </span>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold"
            style={{
              color: accent,
              borderColor: "var(--brand-soft)",
              background: "var(--brand-soft)",
            }}
          >
            <span aria-hidden="true">{meta.flag}</span>
            {wallet.currency}
          </span>
          {isPrimary && (
            <span className="inline-flex items-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
              Primary
            </span>
          )}
        </div>
      </div>

      {/* Currency human name */}
      <div className="relative z-10 mt-1">
        <p className="text-xs font-semibold text-[var(--foreground-muted)]">
          {wallet.currency === "NGN"
            ? t("customer.accounts.ngnName")
            : wallet.currency === "XOF"
            ? t("customer.accounts.xofName")
            : t("customer.accounts.usdName")}
        </p>
      </div>

      {/* Primary balance */}
      <div className="relative z-10 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[var(--foreground)] tabular">
            {visibleBalance}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[9px] font-mono font-bold text-[var(--foreground-muted)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {t("customer.accounts.live")}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-medium text-[var(--foreground-muted)]">
          {t("customer.accounts.available")}
        </p>
      </div>

      {/* Middle: account identity */}
      <div className="relative z-10 mt-5 flex items-end justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold text-[var(--foreground)] truncate">
            {wallet.accountName}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-[var(--foreground-muted)]">
            <span className="tracking-wide">{maskAccountNumber(wallet.accountNumber)}</span>
            <button
              onClick={handleCopy}
              className="rounded-md p-0.5 transition-colors hover:bg-[var(--surface-3)]"
              aria-label={t("customer.accounts.copyNumber")}
              title={t("customer.accounts.copyNumber")}
            >
              {copied ? <Check className="h-3 w-3 text-[var(--success)]" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="rounded-full p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          aria-label={t("customer.accounts.options")}
          title={t("customer.accounts.options")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom row: status + actions */}
      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold kp-badge-${statusMeta.tone}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusMeta.label}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.(wallet);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--brand-border)] hover:text-[var(--brand-primary)]"
          >
            <ArrowRight className="h-3 w-3" /> {t("customer.accounts.details")}
          </button>
        </div>
      </div>

      {/* Actions menu (contextual; functions the backend actually supports) */}
      {menuOpen && (
        <div className="absolute bottom-2 right-2 z-[var(--z-sheet)] w-44 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-lg)]">
          <ActionMenuItem icon={<Wallet className="h-3.5 w-3.5" />} label={t("customer.accounts.transfer")} />
          <ActionMenuItem icon={<ArrowDownLeft className="h-3.5 w-3.5" />} label={t("customer.accounts.fund")} />
          <ActionMenuItem icon={<ArrowUpRight className="h-3.5 w-3.5" />} label={t("customer.accounts.withdraw")} />
          <ActionMenuItem icon={<CreditCard className="h-3.5 w-3.5" />} label={t("customer.accounts.transactions")} />
        </div>
      )}
    </article>
  );
};

function ActionMenuItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-3)]">
      <span className="text-[var(--foreground-muted)]">{icon}</span>
      {label}
    </button>
  );
}

export default AccountCard;
