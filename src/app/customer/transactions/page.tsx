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

const CURRENCY_OPTIONS = [
  { id: "ALL", labelKey: "transactions.accountAll" },
  { id: "XOF", labelKey: "transactions.accountXof" },
  { id: "NGN", labelKey: "transactions.accountNgn" },
] as const;

const CATEGORY_OPTIONS = [
  { id: "ALL", labelKey: "transactions.filterAll" },
  { id: "TRANSFERS", labelKey: "transactions.filterTransfers" },
  { id: "FUNDING", labelKey: "transactions.filterFunding" },
  { id: "FX", labelKey: "transactions.filterFx" },
  { id: "BILLS", labelKey: "transactions.filterBills" },
] as const;

const STATUS_OPTIONS: { id: "ALL" | CustomerTransactionStatus; labelKey: string }[] = [
  { id: "ALL", labelKey: "transactions.statusAll" },
  { id: "SUCCESSFUL", labelKey: "transactions.statusSuccess" },
  { id: "PENDING", labelKey: "transactions.statusPending" },
  { id: "PROCESSING", labelKey: "transactions.statusProcessing" },
  { id: "FAILED", labelKey: "transactions.statusFailed" },
  { id: "REVERSED", labelKey: "transactions.statusReversed" },
  { id: "DISPUTED", labelKey: "transactions.statusDisputed" },
];

const RANGE_OPTIONS = [
  { id: "ALL", labelKey: "transactions.rangeAll" },
  { id: "TODAY", labelKey: "transactions.rangeToday" },
  { id: "WEEK", labelKey: "transactions.rangeWeek" },
  { id: "MONTH", labelKey: "transactions.rangeMonth" },
] as const;

/** Only offer statuses the backend can actually produce for this customer. */
const CARDS_ENABLED = false;

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

  const showCardsCategory = isServiceAvailable("cards") && CARDS_ENABLED;

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
            <p className="text-xs text-[var(--foreground-muted)] truncate">
              {historyPhase === "ready"
                ? t("transactions.subtitle", { count: historyTotalCount })
                : t("transactions.subtitleLoading")}
            </p>
          </div>
        </div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" aria-hidden="true" />
        <input
          type="search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder={t("transactions.searchPlaceholder")}
          aria-label={t("transactions.searchLabel")}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
        {searchDraft && (
          <button
            type="button"
            onClick={() => setSearchDraft("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            aria-label={t("transactions.clearSearch")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters — XOF first, always */}
      <div className="space-y-2.5">
        <FilterRow label={t("transactions.filterAccount")} accent>
          {CURRENCY_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              active={historyFilters.currency === o.id}
              onClick={() => setHistoryFilters({ currency: o.id as HistoryFilters["currency"] })}
            >
              {t(o.labelKey)}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t("transactions.filterType")}>
          {CATEGORY_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              active={historyFilters.category === o.id}
              onClick={() => setHistoryFilters({ category: o.id as HistoryFilters["category"] })}
            >
              {t(o.labelKey)}
            </Chip>
          ))}
          {showCardsCategory && (
            <Chip
              active={historyFilters.category === "CARDS"}
              onClick={() => setHistoryFilters({ category: "CARDS" })}
            >
              {t("transactions.filterCards")}
            </Chip>
          )}
        </FilterRow>

        <FilterRow label={t("transactions.filterStatus")}>
          {STATUS_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              active={historyFilters.status === o.id}
              onClick={() => setHistoryFilters({ status: o.id as HistoryFilters["status"] })}
            >
              {t(o.labelKey)}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={t("transactions.filterDate")}>
          {RANGE_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              active={historyFilters.range === o.id}
              onClick={() => setHistoryFilters({ range: o.id as HistoryFilters["range"] })}
            >
              {t(o.labelKey)}
            </Chip>
          ))}
        </FilterRow>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] font-bold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" aria-hidden="true" />
            {t("transactions.clearFilters")}
          </button>
        )}
      </div>

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

      {/* Body: exactly one of skeleton / error / empty / rows */}
      {historyPhase === "loading" && historyItems.length === 0 ? (
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
      ) : historyItems.length === 0 ? (
        <DataEmptyState
          title={hasFilters ? t("transactions.emptyFiltered") : t("transactions.empty")}
          hint={hasFilters ? t("transactions.emptyFilteredHint") : t("transactions.emptyHint")}
          action={hasFilters ? { label: t("transactions.clearFilters"), onClick: clearFilters } : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {historyItems.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              t={t}
              lang={language}
              isBalanceHidden={isBalanceHidden}
              onToggleMask={toggleHideBalance}
              showMaskControl
              onOpen={setDetail}
            />
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

const FilterRow: React.FC<{
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}> = ({ label, accent, children }) => (
  <div className="flex items-center gap-2 min-w-0">
    <span
      className={`text-[10px] font-mono uppercase tracking-wider shrink-0 w-[52px] ${
        accent ? "text-[var(--brand-primary)] font-bold" : "text-[var(--foreground-muted)]"
      }`}
    >
      {label}
    </span>
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 -mx-0.5 px-0.5">
      {children}
    </div>
  </div>
);

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors min-h-[32px] ${
      active
        ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
    }`}
  >
    {children}
  </button>
);

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
    { label: t("detail.account"), value: `${tx.currency} • ${isBalanceHidden ? "••••" : tx.currency}` },
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
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("detail.title")}
        className="fixed z-[61] inset-x-0 bottom-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:max-w-md rounded-t-3xl sm:rounded-3xl glass-modal border border-[var(--border)] shadow-[var(--shadow-lg)] max-h-[82vh] overflow-y-auto overscroll-contain"
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
              className="flex-1 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold py-2.5 min-h-[44px]"
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

