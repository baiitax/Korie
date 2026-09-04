"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import AccountCard from "@/components/customer/ui/AccountCard";
import AccountSwitcher from "@/components/customer/ui/AccountSwitcher";
import QuickActions from "@/components/customer/ui/QuickActions";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";
import { CustomerTransaction } from "@/types/customer";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Globe,
  LifeBuoy,
  Activity,
} from "lucide-react";

function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "SUCCESSFUL":
    case "COMPLETED":
      return "success";
    case "PENDING":
    case "PROCESSING":
      return "warning";
    case "FAILED":
      return "danger";
    case "REVERSED":
    case "CANCELLED":
      return "info";
    default:
      return "neutral";
  }
}

export default function CustomerDashboardPage() {
  const { customer, wallets, transactions, openReceipt, isBalanceHidden, t } = useCustomer();

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("dashboard.greetingMorning")
      : hour < 17
      ? t("dashboard.greetingAfternoon")
      : t("dashboard.greetingEvening");

  const recentTransactions = transactions.slice(0, 5);
  const ngnWallet = wallets.find((w) => w.currency === "NGN");
  const xofWallet = wallets.find((w) => w.currency === "XOF");
  const hasCrossBorder = transactions.some(
    (tx) => tx.sourceCurrency && tx.destinationCurrency && tx.sourceCurrency !== tx.destinationCurrency,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Greeting */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--brand-primary)] font-bold">
            {t("common.appName")} {t("customer.shell.greeting")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            {greeting}, {customer.firstName} 👋
          </h1>
        </div>

        <Link
          href="/customer/kyc"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-soft)] border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-soft-strong)] transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{customer.kycTier} • Verified</span>
        </Link>
      </div>

      {/* 2. Account Switcher */}
      <AccountSwitcher />

      {/* 3. NGN + XOF Premium Account Cards (side by side on desktop, snap-scroll on mobile) */}
      <section aria-label={t("customer.accounts.title")}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
            {t("customer.accounts.title")}
          </h2>
          <span className="text-[11px] font-mono text-[var(--foreground-muted)]">
            {wallets.length} {t("customer.accounts.available")}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets
            .filter((w) => w.currency === "NGN" || w.currency === "XOF" || w.currency === "USD")
            .map((wallet) => (
              <AccountCard
                key={wallet.id}
                wallet={wallet}
                onOpen={() => {
                  // Account details are served by the wallet/accounts page which
                  // reflects the same wallet context.
                  window.location.href = "/customer/wallets";
                }}
              />
            ))}
        </div>
      </section>

      {/* 4. Quick Actions */}
      <QuickActions />

      {/* 5. Recent Activity */}
      <section className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--foreground)]">{t("customer.dashboard.recentActivity")}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--surface-3)] text-[var(--foreground-muted)]">
              {transactions.length}
            </span>
          </div>

          <Link
            href="/customer/transactions"
            className="text-xs font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] flex items-center gap-1"
          >
            <span>{t("customer.dashboard.viewAll")}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-[var(--foreground-muted)] opacity-50" />
            <p className="mt-2 text-sm font-semibold text-[var(--foreground-muted)]">{t("customer.dashboard.allCaughtUp")}</p>
            <p className="text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.noTxHint")}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onOpen={openReceipt} isBalanceHidden={isBalanceHidden} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Cross-border activity */}
      <section className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-[var(--brand-secondary)]" />
          <h2 className="text-sm font-bold text-[var(--foreground)]">{t("customer.dashboard.crossBorder")}</h2>
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.crossBorderLead")}</p>

        {hasCrossBorder && ngnWallet && xofWallet ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <FlowNode
              symbol={ngnWallet.symbol}
              label={t("customer.accounts.ngnName")}
              value={isBalanceHidden ? "••••••••" : formatMoney(ngnWallet.availableBalance, "NGN")}
              tone="brand"
            />
            <div className="flex items-center justify-center gap-2 text-[var(--brand-secondary)]">
              <span className="h-px flex-1 bg-[var(--brand-border)]" />
              <ArrowDownLeft className="h-4 w-4" />
              <span className="text-[10px] font-mono font-bold uppercase">KoriePay</span>
              <ArrowDownLeft className="h-4 w-4" />
              <span className="h-px flex-1 bg-[var(--brand-border)]" />
            </div>
            <FlowNode
              symbol={xofWallet.symbol}
              label={t("customer.accounts.xofName")}
              value={isBalanceHidden ? "••••••••" : formatMoney(xofWallet.availableBalance, "XOF")}
              tone="amber"
            />
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3">
            <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
            <p className="text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.crossBorderLead")}</p>
          </div>
        )}
      </section>

      {/* 7. Security & support */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/customer/security"
          className="group rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-[var(--shadow-card)] transition-all hover:border-[var(--brand-border)]"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-[var(--brand-primary)]" />
            <h2 className="text-sm font-bold text-[var(--foreground)]">{t("customer.dashboard.security")}</h2>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">{customer.mfaEnabled ? "MFA" : "PIN"} • {customer.kycStatus} • {t("customer.shell.secureSession")}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] group-hover:gap-2 transition-all">
            {t("customer.dashboard.viewAll")} <ChevronRight className="h-3 w-3" />
          </span>
        </Link>

        <Link
          href="/customer/support"
          className="group rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-[var(--shadow-card)] transition-all hover:border-[var(--brand-border)]"
        >
          <div className="flex items-center gap-2 mb-2">
            <LifeBuoy className="h-4 w-4 text-[var(--brand-secondary)]" />
            <h2 className="text-sm font-bold text-[var(--foreground)]">{t("customer.dashboard.support")}</h2>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.security")}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-secondary)] group-hover:gap-2 transition-all">
            {t("customer.dashboard.viewAll")} <ChevronRight className="h-3 w-3" />
          </span>
        </Link>
      </div>
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
  const amountColor = isInward ? "text-[var(--success)]" : "text-[var(--foreground)]";

  return (
    <div
      onClick={() => onOpen(tx)}
      className="py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-2)] -mx-2 px-2 rounded-2xl cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isInward
              ? "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--brand-soft)]"
              : "bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border)]"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-bold text-[var(--foreground)] truncate">{tx.title}</div>
          <div className="text-[11px] text-[var(--foreground-muted)] truncate flex items-center gap-1.5 mt-0.5">
            <span>{tx.recipientName || tx.senderName || tx.description}</span>
            <span>•</span>
            <span className="font-mono text-[10px]">
              {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={`text-xs sm:text-sm font-extrabold font-mono tabular ${amountColor}`}>
          {isInward ? "+" : "−"}
          {isBalanceHidden ? "••••" : formatMoney(tx.amount, tx.currency)}
        </div>
        <div className="flex items-center justify-end gap-1 mt-1">
          <StatusBadge tone={statusTone(tx.status)}>{t(`customer.txStatus.${tx.status}`)}</StatusBadge>
        </div>
      </div>
    </div>
  );
}

function FlowNode({
  symbol,
  label,
  value,
  tone,
}: {
  symbol: string;
  label: string;
  value: string;
  tone: "brand" | "amber";
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3.5">
      <div className={`text-[10px] font-mono font-bold uppercase ${tone === "amber" ? "text-[var(--brand-secondary)]" : "text-[var(--brand-primary)]"}`}>
        {symbol} {label}
      </div>
      <div className="mt-1 font-mono text-lg font-extrabold text-[var(--foreground)] tabular">{value}</div>
    </div>
  );
}
