"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCustomer, HistoryFilters, EMPTY_HISTORY_FILTERS } from "@/components/customer/CustomerContext";
import TransactionRow from "@/components/customer/ui/TransactionRow";
import {
  TransactionHistorySkeleton,
  DataErrorState,
  DataEmptyState,
  DataFreshnessBar,
} from "@/components/customer/ui/CustomerStateViews";
import { transactionStatusLabelKey } from "@/components/customer/ui/TransactionStatusBadge";
import { isLiveStatus } from "@/components/customer/ui/TransactionStatusBadge";
import { CustomerTransaction, CustomerTransactionStatus } from "@/types/customer";
import { maskAccountNumber } from "@/lib/money";
import {
  TransactionFiltersSheet,
  TransactionFiltersButton,
  CURRENCY_OPTIONS,
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  countActiveFilters,
} from "@/components/customer/ui/TransactionFilters";
import { ArrowLeft, Search, Download, ChevronRight, X } from "lucide-react";

/**
 * Customer Transaction History — rebuilt against the P0 findings.
 * ---------------------------------------------------------------------------
 * Before: the page filtered a hardcoded in-memory array with `useMemo`, so
 * every interaction was client-side, there was no loading state, no error
 * state, no pagination, and a backend failure rendered the same rows as a
 * healthy account.
 *
 * Now: filters are handed to the API (server-side, ownership-scoped), results
 * arrive one cursor page at a time, and the four states are structurally
 * distinct — skeleton / error / empty / rows. There is deliberately no
 * aggressive polling; the freshness bar shows when the data was true, and a
 * live-refresh affordance appears only when a non-terminal row exists.
 */

/* Filter options and the sheet itself live in
   `@/components/customer/ui/TransactionFilters` so the chip row above and the
   sheet can never disagree about what the legal values are. */

/** "Today" / "Yesterday" / a dated label — grouping the list the way a bank
 *  statement does, from the row's own timestamp in the customer's locale. */
function groupRowsByDay(
  rows: CustomerTransaction[],
  language: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): { key: string; label: string; rows: CustomerTransaction[] }[] {
  const locale = language === "fr" ? "fr-FR" : language === "ha" ? "ha" : "en-GB";
  const groups: { key: string; label: string; rows: CustomerTransaction[] }[] = [];
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  for (const tx of rows) {
    const d = new Date(tx.createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const offsetDays = Math.round((startOfDay - dayStart) / 86_400_000);
    let label: string;
    let key: string;
    if (offsetDays === 0) {
      label = t("transactions.groupToday");
      key = "today";
    } else if (offsetDays === 1) {
      label = t("transactions.groupYesterday");
      key = "yesterday";
    } else {
      label = new Date(dayStart).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
      key = String(dayStart);
    }
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(tx);
    else groups.push({ key, label, rows: [tx] });
  }
  return groups;
}

function filterLabel(
  id: string,
  options: readonly { id: string; labelKey: string }[],
  t: (key: string) => string,
): string {
  return t(options.find((o) => o.id === id)?.labelKey ?? "transactions.filterAll");
}

const ActiveChip: React.FC<{ label: string; onRemove: () => void; removeLabel: string }> = ({ label, onRemove, removeLabel }) => (
  <span className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft)] pl-2.5 pr-1 text-[11px] font-bold text-[var(--brand-primary)]">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="grid h-5 w-5 place-items-center rounded-md hover:bg-[var(--brand-soft-strong)]"
      aria-label={`${removeLabel}: ${label}`}
    >
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  </span>
);


export default function CustomerTransactionsPage() {
  const {
    t,
    language,
    historyPhase,
    historyItems,
    historyError,
    historyHasMore,
    historyTotalCount,
    historyUpdatedAt,
    historyFilters,
    setHistoryFilters,
    loadHistory,
    loadMoreHistory,
    isBalanceHidden,
    toggleHideBalance,
    openReceipt,
    isServiceAvailable,
  } = useCustomer();

  const [searchDraft, setSearchDraft] = useState(historyFilters.search);
  const [detail, setDetail] = useState<CustomerTransaction | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  /* Debounced search → server, not a client filter over whatever happens to be loaded. */
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (searchDraft !== historyFilters.search) {
        setHistoryFilters({ search: searchDraft });
      }
    }, 320);
    return () => clearTimeout(searchTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const hasFilters = useMemo(
    () =>
      historyFilters.currency !== "ALL" ||
      historyFilters.category !== "ALL" ||
      historyFilters.status !== "ALL" ||
      historyFilters.range !== "ALL" ||
      historyFilters.search.trim() !== "",
    [historyFilters],
  );

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    setHistoryFilters(EMPTY_HISTORY_FILTERS);
  }, [setHistoryFilters]);

  const liveRows = historyItems.filter((tx) => isLiveStatus(tx.status));

  /* No rows yet and no answer yet — those are the same screen, and neither one is
     "empty". */
  const showHistorySkeleton = historyItems.length === 0 && (historyPhase === "loading" || historyPhase === "idle");

  /* Controlled refresh: manual + a single follow-up when something is pending. */
  const handleRefresh = useCallback(() => {
    void loadHistory({ silent: true });
  }, [loadHistory]);

  useEffect(() => {
    if (liveRows.length === 0) return;
    // Backoff, not a tight loop: one extra read shortly after load, only while
    // a row is genuinely non-terminal. §17 + §69 (no realtime channel exists).
    const t1 = setTimeout(handleRefresh, 12000);
    const t2 = setTimeout(handleRefresh, 30000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRows.length, historyUpdatedAt]);


  const exportCsv = () => {
    setIsExporting(true);
    try {
      const headers =
        "Date,Reference,Counterparty,Type,Direction,Amount,Currency,Fee,Status\n";
      const rows = historyItems
        .map(
          (tr) =>
            `"${tr.createdAt}","${tr.reference}","${tr.recipientName || tr.senderName || ""}","${tr.type}","${tr.direction}",${tr.amount},"${tr.currency}",${tr.fee},"${tr.status}"`,
        )
        .join("\n");
      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `koriepay-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight truncate">
              {t("transactions.title")}
            </h1>
            {/* Two readable lines beat one ellipsized mid-word (§9: financial page
                titles are short, their explanations are not). */}
            <p className="line-clamp-2 text-xs text-[var(--foreground-muted)] sm:line-clamp-none">
              {historyPhase === "ready"
                ? t("transactions.subtitle", { count: historyTotalCount })
                : t("transactions.subtitleLoading")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <TransactionFiltersButton onOpen={() => setFiltersOpen(true)} />
          <button
            type="button"
            onClick={exportCsv}
          disabled={historyPhase !== "ready" || historyItems.length === 0 || isExporting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] disabled:opacity-50 transition-colors shrink-0"
          aria-label={t("transactions.exportCsv")}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t("transactions.exportCsv")}</span>
          </button>
        </div>
      </div>

      {/* Search stays on the surface: it is the one control customers use while
          scrolling. Everything narrower lives behind the sheet (§20). */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" aria-hidden="true" />
        <input
          type="search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder={t("transactions.searchPlaceholder")}
          aria-label={t("transactions.searchLabel")}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-9 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
        {searchDraft && (
          <button
            type="button"
            onClick={() => setSearchDraft("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            aria-label={t("transactions.clearSearch")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* What is currently applied, without needing to open anything. The chips
          are read-only summaries plus one clear — the choosing happens in the
          sheet, so there is one source of truth for the filter state. */}
      {countActiveFilters(historyFilters) > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("transactions.appliedFilters")}>
          <ActiveChip label={filterLabel(historyFilters.currency, CURRENCY_OPTIONS, t)} onRemove={() => setHistoryFilters({ currency: "ALL" })} removeLabel={t("transactions.removeFilter")} />
          {historyFilters.category !== "ALL" && (
            <ActiveChip label={filterLabel(historyFilters.category, CATEGORY_OPTIONS, t)} onRemove={() => setHistoryFilters({ category: "ALL" })} removeLabel={t("transactions.removeFilter")} />
          )}
          {historyFilters.status !== "ALL" && (
            <ActiveChip label={filterLabel(historyFilters.status, STATUS_OPTIONS, t)} onRemove={() => setHistoryFilters({ status: "ALL" })} removeLabel={t("transactions.removeFilter")} />
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex min-h-[30px] items-center gap-1 rounded-lg px-1.5 text-[11px] font-bold text-[var(--brand-primary)] hover:underline"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            {t("transactions.clearFilters")}
          </button>
        </div>
      )}

      <DataFreshnessBar
        updatedAt={historyUpdatedAt}
        onRefresh={handleRefresh}
        isRefreshing={historyPhase === "loading"}
        updatedLabel={t("transactions.lastUpdated")}
        refreshLabel={t("transactions.refresh")}
        lang={language}
      />

      {liveRows.length > 0 && (
        <p className="text-[11px] text-[var(--foreground-muted)] -mt-2" role="status">
          {t("transactions.awaitingCount", { count: liveRows.length })}
        </p>
      )}

      {/* Body: exactly one of skeleton / error / empty / rows.
          "idle" counts as loading: the first read has not been answered yet, and
          rendering the empty state in that window tells the customer they have no
          transactions when the truth is "we do not know yet". */}
      {showHistorySkeleton ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 overflow-hidden">
          <TransactionHistorySkeleton rows={6} label={t("transactions.loading")} />
        </div>
      ) : historyPhase === "error" && historyError ? (
        <DataErrorState
          error={historyError}
          onRetry={() => void loadHistory()}
          retryLabel={t("common.tryAgain")}
          surface="transactions"
        />
      ) : historyItems.length === 0 && historyPhase === "ready" ? (
        <DataEmptyState
          title={hasFilters ? t("transactions.emptyFiltered") : t("transactions.empty")}
          hint={hasFilters ? t("transactions.emptyFilteredHint") : t("transactions.emptyHint")}
          action={hasFilters ? { label: t("transactions.clearFilters"), onClick: clearFilters } : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {groupRowsByDay(historyItems, language, t).map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="sticky top-0 z-[1] bg-[var(--surface-2)] px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                {group.label}
              </h2>
              <ul className="divide-y divide-[var(--border)]">
                {group.rows.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow
                      tx={tx}
                      t={t}
                      lang={language}
                      isBalanceHidden={isBalanceHidden}
                      onToggleMask={toggleHideBalance}
                      showMaskControl
                      onOpen={setDetail}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {historyHasMore && (
            <button
              type="button"
              onClick={() => void loadMoreHistory()}
              disabled={historyPhase === "loading"}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-[var(--brand-primary)] hover:bg-[var(--surface-elevated)] disabled:opacity-60 min-h-[44px]"
            >
              {historyPhase === "loading" ? t("transactions.loadingMore") : t("transactions.loadMore")}
              {historyPhase !== "loading" && <ChevronRight className="w-3.5 h-3.5 rotate-90" aria-hidden="true" />}
            </button>
          )}
        </div>
      )}

      <TransactionFiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} />

      {detail && (
        <TransactionDetailSheet
          tx={detail}
          onClose={() => setDetail(null)}
          onOpenReceipt={() => {
            setDetail(null);
            openReceipt(detail);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

/**
 * Detail sheet. Renders the row the customer selected immediately (so there is
 * no blank flash) and labels it as list-sourced; there is no second truth in
 * this screen. Receipt remains the authoritative document.
 */
const TransactionDetailSheet: React.FC<{
  tx: CustomerTransaction;
  onClose: () => void;
  onOpenReceipt: () => void;
}> = ({ tx, onClose, onOpenReceipt }) => {
  const { t, isBalanceHidden, language } = useCustomer();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: t("detail.status"), value: t(transactionStatusLabelKey(tx.status)) },
    { label: t("detail.amount"), value: isBalanceHidden ? "•••••••" : `${tx.direction === "OUTWARD" ? "−" : "+"}${new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB").format(tx.amount)} ${tx.currency}` },
    { label: t("detail.fee"), value: isBalanceHidden ? "••••" : `${new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB").format(tx.fee)} ${tx.currency}` },
    { label: t("detail.type"), value: t(`transactions.cat.${tx.category}`) },
    { label: t("detail.sender"), value: tx.senderName || "KoriePay" },
    { label: t("detail.recipient"), value: tx.recipientName || "—" },
    // The list payload carries the destination account only; showing the currency
    // twice ("XOF • XOF") was a row that said nothing. When the account is known
    // it is masked like every other number in this portal, and when it is not,
    // the row is absent rather than padded with a placeholder.
    ...(tx.recipientAccount
      ? [{ label: t("detail.toAccount"), value: maskAccountNumber(tx.recipientAccount), mono: true }]
      : []),
    { label: t("detail.reference"), value: tx.reference, mono: true },
    { label: t("detail.date"), value: new Date(tx.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium" }) },
    { label: t("detail.time"), value: new Date(tx.createdAt).toLocaleTimeString(language === "fr" ? "fr-FR" : "en-GB", { timeStyle: "short" }) },
  ];
  if (tx.exchangeRate && tx.destinationCurrency) {
    rows.push({
      label: t("detail.fxRate"),
      value: `1 ${tx.sourceCurrency} = ${tx.exchangeRate} ${tx.destinationCurrency}`,
      mono: true,
    });
    if (tx.destinationAmount != null) {
      rows.push({
        label: t("detail.destinationAmount"),
        value: isBalanceHidden
          ? "•••••••"
          : `${new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB").format(tx.destinationAmount)} ${tx.destinationCurrency}`,
      });
    }
  }

  return (
    <>
      <div
        className="kp-sheet-scrim fixed inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("detail.title")}
        className="kp-sheet kp-sheet--dialog fixed inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto overscroll-contain sm:inset-auto sm:right-6 sm:bottom-6 sm:max-w-md sm:rounded-b-[26px]"
      >
        <div className="sticky top-0 glass-modal px-4 py-3 flex items-center justify-between border-b border-[var(--border)]">
          <h2 className="text-sm font-extrabold text-[var(--foreground)]">{t("detail.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-1 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] min-h-[36px] min-w-[36px] grid place-items-center"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center space-y-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">
              {tx.direction === "OUTWARD" ? t("detail.sentTo") : t("detail.receivedFrom")}
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-[var(--foreground)]">
              {isBalanceHidden ? "•••••••" : `${tx.direction === "OUTWARD" ? "−" : "+"}${new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB").format(tx.amount)} ${tx.currency === "XOF" ? "CFA" : "₦"}`}
            </div>
            <div className="text-xs font-semibold text-[var(--foreground-muted)] truncate">
              {tx.recipientName || tx.senderName || tx.title}
            </div>
          </div>

          <dl className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-[11px] text-[var(--foreground-muted)] font-semibold shrink-0">{r.label}</dt>
                <dd className={`text-[11px] font-bold text-[var(--foreground)] text-right break-all ${r.mono ? "font-mono" : ""}`}>
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenReceipt}
              className="flex-1 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold py-2.5 min-h-[44px]"
            >
              {t("detail.receipt")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] px-3 py-2.5 min-h-[44px]"
            >
              {t("common.close")}
            </button>
          </div>

          <p className="text-[10px] text-[var(--foreground-muted)] text-center leading-relaxed">
            {t("detail.noInternalNote")}
          </p>
        </div>
      </div>
    </>
  );
};

