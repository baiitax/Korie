"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCustomer } from "../CustomerContext";
import TransactionRow from "./TransactionRow";
import { TransactionRowsSkeleton } from "./KoriePaySkeletons";
import { DataErrorState } from "./CustomerStateViews";

/**
 * TransactionPreview — "Recent activity" on the dashboard (§4 / §16 / §17 / §18).
 *
 * Extracted from the dashboard page because History and Home must not render the
 * same record two ways: this uses the *same* `TransactionRow` as
 * `/customer/transactions`, with the same balance-masking preference, the same
 * status badge and the same tap target (the row opens the detail sheet). When the
 * two were separate implementations, a reversed transfer could look settled in
 * one place and reversed in the other.
 *
 * Data is `historyItems` from the portal context — rows the session owns, read
 * through `/api/customer/portal/transactions` — so this section is empty when the
 * ledger is empty and shows the failure when the read failed. It never renders a
 * sample row to look alive: an empty state with a route out ("Start a transfer")
 * is the honest version of "nothing has happened on this account yet".
 */
export const TransactionPreview: React.FC<{ limit?: number }> = ({ limit = 5 }) => {
  const {
    transactions,
    transactionsTotalCount,
    historyPhase,
    historyError,
    loadHistory,
    openReceipt,
    isBalanceHidden,
    toggleHideBalance,
    language,
    t,
  } = useCustomer();

  const rows = transactions.slice(0, limit);
  const loading = historyPhase === "loading" && rows.length === 0;

  return (
    <section
      aria-label={t("customer.ledgerHistory")}
      className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--foreground-muted)]">
          <span className="truncate">{t("customer.ledgerHistory")}</span>
          {transactionsTotalCount > 0 && (
            <span className="shrink-0 rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case text-[var(--brand-primary)] tabular">
              {transactionsTotalCount}
            </span>
          )}
        </h2>
        <Link
          href="/customer/transactions"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        >
          {t("customer.dashboard.viewAll")}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      {historyPhase === "error" && historyError ? (
        <div className="p-3">
          <DataErrorState
            error={historyError}
            onRetry={() => void loadHistory()}
            retryLabel={t("common.tryAgain")}
            surface="transactions"
          />
        </div>
      ) : loading ? (
        <div className="px-3.5 py-2">
          <TransactionRowsSkeleton rows={3} />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-9 text-center">
          <p className="text-sm font-bold text-[var(--foreground)]">{t("customer.dashboard.noTransactionsTitle")}</p>
          <p className="mx-auto mt-1 max-w-[34ch] text-xs leading-relaxed text-[var(--foreground-muted)]">
            {t("customer.dashboard.noTransactionsBody")}
          </p>
          <Link
            href="/customer/send-money"
            className="mt-4 inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-[var(--brand-primary)] px-3.5 text-xs font-bold text-[var(--brand-on-primary)] transition-colors hover:bg-[var(--brand-primary-hover)]"
          >
            {t("nav.transfers")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((tx) => (
            <li key={tx.id}>
              <TransactionRow
                tx={tx}
                t={t}
                lang={language}
                isBalanceHidden={isBalanceHidden}
                onToggleMask={toggleHideBalance}
                showMaskControl={false}
                onOpen={openReceipt}
                href="/customer/transactions"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default TransactionPreview;
