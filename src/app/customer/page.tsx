"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import CustomerGreeting from "@/components/customer/ui/CustomerGreeting";
import PrimaryBalanceCard from "@/components/customer/ui/PrimaryBalanceCard";
import QuickActions from "@/components/customer/ui/QuickActions";
import VerificationCard from "@/components/customer/ui/VerificationCard";
import TransactionPreview from "@/components/customer/ui/TransactionPreview";
import EverydayServices from "@/components/customer/ui/EverydayServices";
import { AccountCardsSkeleton } from "@/components/customer/ui/KoriePaySkeletons";
import { DataErrorState } from "@/components/customer/ui/CustomerStateViews";
import { BalanceCardSkeleton } from "@/components/customer/ui/KoriePaySkeletons";
import { ChevronRight } from "lucide-react";
import { formatMoney, maskAccountNumber } from "@/lib/money";

/**
 * Customer dashboard — the hierarchy is the requirement (§4 / §6 / §9 / §10).
 *
 *     Greeting                                   who I am, at a glance
 *     Primary balance (XOF)                      the number, biggest thing here
 *     Quick actions                              the four things I can do
 *     Verification (only when it needs me)       anything blocking my account
 *     Accounts                                   both wallets, XOF listed first
 *     Services                                   what exists, what is coming soon
 *     Recent activity                            the ledger's newest truth
 *     ┌ floating navigation ┐                     always reachable, never hiding
 *
 * Rules this page obeys and how they are enforced:
 *  • **XOF first** — `wallets` arrives ordered from the server (XOF → NGN), and
 *    nothing here re-sorts it; USD is not in the currency list at all.
 *  • **no fabricated numbers** — every figure comes from the portal payload;
 *    while it is in flight the sections show their skeleton shapes, and a failed
 *    read shows an error with Retry instead of an empty list or a placeholder.
 *  • **one privacy control** — the balance card owns it; the sidebar preview and
 *    the history rows follow the same `isBalanceHidden` flag.
 *
 * It used to lead with a carousel of wallet cards (so the XOF balance was one
 * horizontal swipe from being invisible) and a second action grid below it. Both
 * made the customer scroll to find the number that matters.
 */
export default function CustomerDashboardPage() {
  const {
    customer,
    wallets,
    transactions,
    activeCurrency,
    portalPhase,
    portalError,
    refreshPortal,
    isBalanceHidden,
    historyFilters,
    setHistoryFilters,
    t,
  } = useCustomer();

  const loading = portalPhase === "loading";
  const primary = wallets.find((w) => w.currency === "XOF") || wallets[0];

  if (portalPhase === "error" && portalError && !customer) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
        <DataErrorState
          error={portalError}
          onRetry={() => void refreshPortal()}
          retryLabel={t("common.tryAgain")}
          surface="generic"
        />
      </div>
    );
  }

  /** Tapping an account in the directory opens History filtered to that wallet. */
  const openAccount = (currency: string) => setHistoryFilters({ currency: currency as typeof historyFilters.currency });

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 pb-2 sm:p-6 lg:p-8">
      <CustomerGreeting />

      {/* 1 · Primary balance */}
      {primary ? (
        <PrimaryBalanceCard wallet={primary} loading={loading} />
      ) : loading ? (
        <BalanceCardSkeleton />
      ) : (
        <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-center">
          <p className="text-sm font-bold text-[var(--foreground)]">{t("customer.dashboard.noAccountTitle")}</p>
          <p className="mx-auto mt-1 max-w-[38ch] text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.noAccountHint")}</p>
          <Link
            href="/customer/fund"
            className="mt-4 inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-[var(--brand-primary)] px-3.5 text-xs font-bold text-[var(--brand-on-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            {t("customer.fund.title")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* 2 · Quick actions */}
      <QuickActions loading={loading && wallets.length === 0} />

      {/* 3 · Verification, only while it needs the customer (§33) */}
      <VerificationCard />

      {/* 4 · Accounts — the directory; XOF first because the array is server-ordered */}
      <section aria-label={t("customer.accounts.title")} className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--foreground-muted)]">
            {t("customer.accounts.title")}
          </h2>
          <Link
            href="/customer/wallets"
            className="-mr-2 inline-flex min-h-[44px] items-center gap-0.5 rounded-xl px-2 text-xs font-bold text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-primary-hover)]"
          >
            {t("customer.dashboard.manageAccounts")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {loading && wallets.length === 0 ? (
          <AccountCardsSkeleton />
        ) : wallets.length === 0 ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--foreground-muted)]">
            {t("customer.accounts.noneYet")}
          </p>
        ) : (
          <ul className="space-y-2">
            {wallets.map((w) => {
              const isCurrent = w.currency === activeCurrency;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => openAccount(w.currency)}
                    className={`flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
                      isCurrent ? "border-[var(--brand-border)] bg-[var(--brand-soft)]/50" : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-mono text-[10px] font-extrabold"
                      style={
                        w.currency === "XOF"
                          ? { background: "var(--brand-primary)", color: "#fff" }
                          : { background: "var(--surface-3)", color: "var(--foreground)" }
                      }
                      aria-hidden="true"
                    >
                      {w.symbol}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-[var(--foreground)]">
                          {t(w.currency === "XOF" ? "transactions.accountXof" : "transactions.accountNgn")}
                        </span>
                        {w.isPrimary && (
                          <span
                            className="rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                            style={{ background: "var(--brand-gold-soft)", color: "var(--brand-gold-ink)" }}
                          >
                            {t("customer.vault.primary")}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--foreground-muted)]">
                        {maskAccountNumber(w.accountNumber)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-extrabold tabular text-[var(--foreground)]">
                        {isBalanceHidden ? `${w.symbol} ••••••••` : formatMoney(w.availableBalance, w.currency)}
                      </span>
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                        {t("customer.accounts.available")}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--foreground-muted)]" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 5 · Services (real availability, honest labels) */}
      <section aria-label={t("customer.servicesHeading")} className="space-y-2.5">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--foreground-muted)]">
          {t("customer.servicesHeading")}
        </h2>
        <EverydayServices />
      </section>

      {/* 6 · Recent activity — the same row component as History */}
      <TransactionPreview limit={5} />

      {transactions.length > 0 && (
        <p className="pb-1 text-center text-[10px] text-[var(--foreground-muted)]">{t("customer.dashboard.activityNote")}</p>
      )}
    </div>
  );
}
