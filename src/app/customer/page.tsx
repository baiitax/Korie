"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import VaultCard from "@/components/customer/ui/VaultCard";
import HubActions from "@/components/customer/ui/HubActions";
import EverydayServices from "@/components/customer/ui/EverydayServices";
import TransactionRow from "@/components/customer/ui/TransactionRow";
import { KpaySectionLoader } from "@/components/loading";
import { DataErrorState } from "@/components/customer/ui/CustomerStateViews";
import { ChevronRight } from "lucide-react";

/**
 * Customer dashboard.
 *
 * Changes made in this pass:
 *  • the duplicated `statusTone` switch and inline `TransactionRow` are gone —
 *    both screens now render the same row component, so a state can never look
 *    different on the dashboard than it does in history (§65, "do not duplicate
 *    logic between pages");
 *  • the greeting and the notification badge are no longer derived from fake
 *    inputs (the badge used to print `2` or `1` from `customer.mfaEnabled`);
 *  • an empty ledger is now visibly "empty", and a failed read is visibly a
 *    failure with a retry, instead of showing the seeded catalog.
 */
export default function CustomerDashboardPage() {
  const {
    customer,
    wallets,
    activeCurrency,
    setActiveCurrency,
    transactions,
    transactionsTotalCount,
    portalPhase,
    portalError,
    refreshPortal,
    openReceipt,
    isBalanceHidden,
    toggleHideBalance,
    language,
    notifications,
    notificationsCount,
    t,
  } = useCustomer();

  // wallets arrive XOF-first (Niger-first); USD is never customer-visible.
  const visibleWallets = wallets;
  const recentTransactions = transactions.slice(0, 6);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("dashboard.greetingMorning")
      : hour < 17
        ? t("dashboard.greetingAfternoon")
        : t("dashboard.greetingEvening");

  if (!customer) {
    if (portalPhase === "error" && portalError) {
      return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
          <DataErrorState
            error={portalError}
            onRetry={() => void refreshPortal()}
            retryLabel={t("common.tryAgain")}
            surface="transactions"
          />
        </div>
      );
    }
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <KpaySectionLoader message={t("common.loading")} />
      </div>
    );
  }

  const activeVault = wallets.find((w) => w.currency === activeCurrency) || wallets[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Greeting + real notification state */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight truncate">
            {greeting}, {customer.firstName} 👋
          </h1>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{t("customer.dashboard.welcome")}</p>
        </div>
        <Link
          href="/customer/settings"
          className="relative p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
          aria-label={
            notificationsCount > 0
              ? t("customer.shell.alertsWithCount", { count: notificationsCount })
              : t("customer.shell.alertsNone")
          }
        >
          <span className="sr-only">{notifications[0]?.titleKey ? t(notifications[0].titleKey) : ""}</span>
          <BellLink count={notificationsCount} />
        </Link>
      </div>

      {/* Hero vault card (horizontal snap-scroll for multiple currencies) */}
      <section aria-label={t("customer.accounts.title")}>
        {portalPhase === "loading" && visibleWallets.length === 0 ? (
          <KpaySectionLoader message={t("customer.accounts.title")} />
        ) : visibleWallets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border-strong)] p-6 text-center space-y-2">
            <p className="text-sm font-bold text-[var(--foreground)]">{t("customer.dashboard.noAccountTitle")}</p>
            <p className="text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.noAccountHint")}</p>
            <Link
              href="/customer/fund"
              className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold px-3.5 py-2 min-h-[40px]"
            >
              {t("customer.fund.title")} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex snap-x gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              {visibleWallets.map((w) => (
                <VaultCard key={w.id} wallet={w} className="snap-start w-[90%] max-w-[500px] shrink-0" />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              {visibleWallets.map((w) => (
                <button
                  key={w.currency}
                  onClick={() => setActiveCurrency(w.currency)}
                  className={`h-2 rounded-full transition-all min-w-[8px] ${
                    w.currency === activeCurrency
                      ? "w-6 bg-[var(--brand-primary)]"
                      : "w-2 bg-[var(--border-strong)] hover:bg-[var(--brand-soft-strong)]"
                  }`}
                  aria-label={`${w.currency} ${t("customer.accounts.title")}`}
                  aria-current={w.currency === activeCurrency ? "true" : undefined}
                />
              ))}
            </div>

            {activeVault && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold text-[var(--foreground-muted)]">
                <span className="font-mono font-bold text-[var(--foreground)]">{activeVault.currency}</span>
                <span aria-hidden="true">•</span>
                <span>{activeVault.bankName}</span>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-label={t("customer.accounts.title")}>
        <SectionLabel label={t("customer.accounts.title")} />
        <HubActions />
      </section>

      <section>
        <SectionLabel label={t("customer.servicesHeading")} />
        <EverydayServices />
      </section>

      {/* Ledger History — the same row component as the history screen */}
      <section className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
            {t("customer.ledgerHistory")}
            {transactionsTotalCount > 0 && (
              <span className="ml-2 font-mono text-[10px] normal-case text-[var(--brand-primary)]">
                {transactionsTotalCount}
              </span>
            )}
          </h2>
          <Link
            href="/customer/transactions"
            className="text-xs font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] flex items-center gap-1 shrink-0"
          >
            {t("customer.dashboard.viewAll")} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-2">
          {portalPhase === "loading" && recentTransactions.length === 0 ? (
            <KpaySectionLoader message={t("transactions.loading")} />
          ) : recentTransactions.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[var(--foreground-muted)]">
                {t("customer.dashboard.allCaughtUp")}
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.noTxHint")}</p>
              <Link
                href="/customer/send-money"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)] hover:underline"
              >
                {t("nav.transfers")} <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  t={t}
                  lang={language}
                  isBalanceHidden={isBalanceHidden}
                  onToggleMask={toggleHideBalance}
                  showMaskControl={false}
                  onOpen={openReceipt}
                  href="/customer/transactions"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Bell with a count that comes from the notifications API, not from MFA. */
const BellLink: React.FC<{ count: number }> = ({ count }) => (
  <>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[var(--brand-primary)] text-white text-[9px] font-bold font-mono flex items-center justify-center tabular-nums">
        {count > 9 ? "9+" : count}
      </span>
    )}
  </>
);

function SectionLabel({ label }: { label: string }) {
  return <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">{label}</div>;
}
