"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import VaultCard from "@/components/customer/ui/VaultCard";
import HubActions from "@/components/customer/ui/HubActions";
import EverydayServices from "@/components/customer/ui/EverydayServices";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";
import { CustomerTransaction } from "@/types/customer";
import { ArrowUpRight, ArrowDownLeft, ChevronRight, BellRing } from "lucide-react";

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "SUCCESSFUL": return "success";
    case "PENDING":
    case "PROCESSING": return "warning";
    case "FAILED": return "danger";
    case "REVERSED":
    case "CANCELLED": return "info";
    default: return "neutral";
  }
}

export default function CustomerDashboardPage() {
  const { customer, wallets, activeCurrency, setActiveCurrency, transactions, openReceipt, isBalanceHidden, t } = useCustomer();
  // wallets arrive XOF-first (Niger-first); USD is never customer-visible.
  const visibleWallets = wallets;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("dashboard.greetingMorning")
    : hour < 17 ? t("dashboard.greetingAfternoon")
    : t("dashboard.greetingEvening");

  const activeVault = wallets.find((w) => w.currency === activeCurrency) || wallets[0];
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            {greeting}, {customer.firstName} 👋
          </h1>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{t("customer.dashboard.welcome")}</p>
        </div>
        <Link
          href="/customer/support"
          className="relative p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Notifications"
        >
          <BellRing className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--brand-primary)] text-white text-[9px] font-bold font-mono flex items-center justify-center">
            {customer.mfaEnabled ? "2" : "1"}
          </span>
        </Link>
      </div>

      {/* Hero vault card (horizontal snap-scroll for multiple currencies) */}
      <section aria-label={t("customer.accounts.title")}>
        <div className="flex snap-x gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {visibleWallets.map((w, idx) => (
            <VaultCard
              key={w.id}
              wallet={w}
              className={`snap-start w-[90%] max-w-[500px] shrink-0 ${idx === 0 ? "" : ""}`}
            />
          ))}
        </div>

        {/* Vault switcher dots */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {visibleWallets.map((w) => (
              <button
                key={w.currency}
                onClick={() => setActiveCurrency(w.currency)}
                className={`h-2 rounded-full transition-all ${
                  w.currency === activeCurrency ? "w-6 bg-[var(--brand-primary)]" : "w-2 bg-[var(--border-strong)] hover:bg-[var(--brand-soft-strong)]"
                }`}
                aria-label={w.currency}
                aria-current={w.currency === activeCurrency ? "true" : undefined}
              />
            ))}
        </div>

        {/* Active vault summary chip */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold text-[var(--foreground-muted)]">
          <span className="font-mono font-bold text-[var(--foreground)]">{activeVault.currency}</span>
          <span>•</span>
          <span>{activeVault.bankName}</span>
        </div>
      </section>

      {/* Hub Actions */}
      <section aria-label={t("customer.accounts.title")}>
        <SectionLabel label={t("customer.accounts.title")} />
        <HubActions />
      </section>

      {/* Everyday Services */}
      <section>
        <SectionLabel label={t("customer.servicesHeading")} />
        <EverydayServices />
      </section>

      {/* Ledger History */}
      <section className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
            {t("customer.ledgerHistory")}
          </h2>
          <Link
            href="/customer/transactions"
            className="text-xs font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] flex items-center gap-1"
          >
            {t("customer.dashboard.viewAll")} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-2 divide-y divide-[var(--border)]">
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-[var(--foreground-muted)]">{t("customer.dashboard.allCaughtUp")}</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">{t("customer.dashboard.noTxHint")}</p>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onOpen={openReceipt} isBalanceHidden={isBalanceHidden} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
      {label}
    </div>
  );
}

function TransactionRow({
  tx,
  onOpen,
  isBalanceHidden,
}: {
  tx: CustomerTransaction;
  onOpen: (tx: CustomerTransaction) => void;
  isBalanceHidden: boolean;
}) {
  const { t } = useCustomer();
  const isInward = tx.direction === "INWARD";
  const Icon = isInward ? ArrowDownLeft : ArrowUpRight;

  return (
    <div
      onClick={() => onOpen(tx)}
      className="py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-elevated)] -mx-2 px-2 rounded-2xl cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 ${
          isInward ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--surface)] text-[var(--foreground)]"
        }`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--foreground)] truncate">{tx.title}</div>
          <div className="text-[11px] text-[var(--foreground-muted)] truncate mt-0.5">
            {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ·{" "}
            {new Date(tx.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={`text-sm font-extrabold font-mono tabular ${isInward ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
          {isInward ? "+" : "−"}
          {isBalanceHidden ? "••••" : formatMoney(tx.amount, tx.currency)}
        </div>
        <div className="mt-1 flex items-center justify-end">
          <StatusBadge tone={statusTone(tx.status)}>{t(`customer.txStatus.${tx.status}`)}</StatusBadge>
        </div>
      </div>
    </div>
  );
}
