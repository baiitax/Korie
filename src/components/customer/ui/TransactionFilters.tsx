"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useCustomer, HistoryFilters } from "../CustomerContext";

/**
 * TransactionFilters — a compact button and a bottom sheet, not a filter page
 * (directive §20).
 *
 * The previous screen stacked four labelled chip rows above the list. That works
 * on a 1440px desktop and is exhausting on a 390px phone: the first two rows of
 * real transactions were pushed below the fold by controls the customer usually
 * does not need. So the controls collapse behind one button that reports how
 * many filters are active, and the sheet is where the choosing happens.
 *
 * Every option here maps onto something the History API actually accepts
 * (`currency`, `category`, `status`, `range` + `from`/`to` in
 * `parseTransactionQueryParams`), including the custom date range: picking dates
 * issues a real server query, it does not filter the rows already in memory. That
 * is the difference between a filter and a decoration.
 *
 * Mobile: bottom sheet, grab-handle, safe-area padding, Escape and scrim close,
 * focus returned to the trigger. Desktop: the same state, rendered as a
 * centred panel, so there is only one implementation of the choices.
 */

export const CURRENCY_OPTIONS = [
  { id: "ALL", labelKey: "transactions.accountAll" },
  { id: "XOF", labelKey: "transactions.accountXof" },
  { id: "NGN", labelKey: "transactions.accountNgn" },
] as const;

export const CATEGORY_OPTIONS = [
  { id: "ALL", labelKey: "transactions.filterAll" },
  { id: "TRANSFERS", labelKey: "transactions.filterTransfers" },
  { id: "FUNDING", labelKey: "transactions.filterFunding" },
  { id: "FX", labelKey: "transactions.filterFx" },
  { id: "BILLS", labelKey: "transactions.filterBills" },
] as const;

/** Only statuses the engine can actually produce for this customer. */
export const STATUS_OPTIONS: { id: string; labelKey: string }[] = [
  { id: "ALL", labelKey: "transactions.statusAll" },
  { id: "SUCCESSFUL", labelKey: "transactions.statusSuccess" },
  { id: "PENDING", labelKey: "transactions.statusPending" },
  { id: "PROCESSING", labelKey: "transactions.statusProcessing" },
  { id: "FAILED", labelKey: "transactions.statusFailed" },
  { id: "REVERSED", labelKey: "transactions.statusReversed" },
  { id: "DISPUTED", labelKey: "transactions.statusDisputed" },
];

export const RANGE_OPTIONS = [
  { id: "ALL", labelKey: "transactions.rangeAll" },
  { id: "TODAY", labelKey: "transactions.rangeToday" },
  { id: "WEEK", labelKey: "transactions.rangeWeek" },
  { id: "MONTH", labelKey: "transactions.rangeMonth" },
  { id: "CUSTOM", labelKey: "transactions.rangeCustom" },
] as const;

/** How many of the four axes are narrowed — drives the button's badge. */
export function countActiveFilters(f: HistoryFilters): number {
  let n = 0;
  if (f.currency !== "ALL") n += 1;
  if (f.category !== "ALL") n += 1;
  if (f.status !== "ALL") n += 1;
  if (f.range !== "ALL") n += 1;
  if (f.search.trim()) n += 1;
  return n;
}

export const TransactionFiltersButton: React.FC<{ onOpen: () => void; className?: string }> = ({
  onOpen,
  className = "",
}) => {
  const { historyFilters, t } = useCustomer();
  const active = countActiveFilters(historyFilters);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border bg-[var(--surface)] px-2.5 text-[11px] font-bold transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
        active > 0 ? "border-[var(--brand-border)] text-[var(--brand-primary)]" : "border-[var(--border)] text-[var(--foreground-muted)]"
      } ${className}`}
      aria-haspopup="dialog"
      aria-label={t("transactions.filters")}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">{t("transactions.filters")}</span>
      {active > 0 && (
        <span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-[var(--brand-primary)] px-1 font-mono text-[9px] font-bold tabular text-[var(--brand-on-primary)]">
          {active}
        </span>
      )}
    </button>
  );
};

export const TransactionFiltersSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { historyFilters, setHistoryFilters, loadHistory, t } = useCustomer();
  const [draft, setDraft] = useState<HistoryFilters>(historyFilters);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Re-seed from live state each time the sheet opens, and discard the draft if
  // the customer closes it without applying: an un-applied picker is how filters
  // start lying about what the list contains.
  useEffect(() => {
    if (open) setDraft(historyFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(historyFilters), [draft, historyFilters]);
  const active = countActiveFilters(draft);

  if (!open) return null;

  const apply = () => {
    setHistoryFilters(draft);
    onClose();
    // `setHistoryFilters` triggers the request in the provider; this only makes
    // the reset path deterministic when nothing changed.
    if (!dirty) void loadHistory();
  };

  const reset = () => {
    const cleared: HistoryFilters = {
      currency: "ALL",
      category: "ALL",
      status: "ALL",
      range: "ALL",
      from: undefined,
      to: undefined,
      search: "",
    };
    setDraft(cleared);
    setHistoryFilters(cleared);
    onClose();
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="kp-sheet-scrim fixed inset-0 bg-black/30 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("transactions.filtersTitle")}
        className="kp-sheet fixed inset-x-0 bottom-0 mx-auto flex max-h-[82vh] w-full max-w-lg flex-col rounded-t-[26px] sm:bottom-6 sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-[var(--foreground)]">{t("transactions.filtersTitle")}</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              {active > 0 ? t("transactions.filtersActive", { count: active }) : t("transactions.filtersNone")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="inline-grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          <Group label={t("transactions.filterAccount")} accent>
            {CURRENCY_OPTIONS.map((o) => (
              <Pill key={o.id} active={draft.currency === o.id} onClick={() => setDraft({ ...draft, currency: o.id as HistoryFilters["currency"] })}>
                {t(o.labelKey)}
              </Pill>
            ))}
          </Group>

          <Group label={t("transactions.filterType")}>
            {CATEGORY_OPTIONS.map((o) => (
              <Pill key={o.id} active={draft.category === o.id} onClick={() => setDraft({ ...draft, category: o.id as HistoryFilters["category"] })}>
                {t(o.labelKey)}
              </Pill>
            ))}
          </Group>

          <Group label={t("transactions.filterStatus")}>
            {STATUS_OPTIONS.map((o) => (
              <Pill key={o.id} active={draft.status === o.id} onClick={() => setDraft({ ...draft, status: o.id as HistoryFilters["status"] })}>
                {t(o.labelKey)}
              </Pill>
            ))}
          </Group>

          <Group label={t("transactions.filterDate")}>
            {RANGE_OPTIONS.map((o) => (
              <Pill key={o.id} active={draft.range === o.id} onClick={() => setDraft({ ...draft, range: o.id as HistoryFilters["range"] })}>
                {t(o.labelKey)}
              </Pill>
            ))}
          </Group>

          {draft.range === "CUSTOM" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                  {t("transactions.rangeFrom")}
                </span>
                <input
                  type="date"
                  value={draft.from ?? ""}
                  max={draft.to ?? undefined}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value || undefined })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                  {t("transactions.rangeTo")}
                </span>
                <input
                  type="date"
                  value={draft.to ?? ""}
                  min={draft.from ?? undefined}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value || undefined })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </label>
            </div>
          )}
        </div>

        {/* Sticky action bar: above the safe area, and the sheet never covers it. */}
        <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={reset}
            disabled={active === 0}
            className="min-h-[44px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)] disabled:opacity-50"
          >
            {t("transactions.clearFilters")}
          </button>
          <button
            type="button"
            onClick={apply}
            className="min-h-[44px] flex-1 rounded-xl bg-[var(--brand-primary)] text-xs font-bold text-[var(--brand-on-primary)] transition-colors hover:bg-[var(--brand-primary-hover)]"
          >
            {t("transactions.applyFilters")}
          </button>
        </div>
      </div>
    </>
  );
};

const Group: React.FC<{ label: string; accent?: boolean; children: React.ReactNode }> = ({ label, accent, children }) => (
  <fieldset className="min-w-0">
    <legend
      className={`mb-2 text-[10px] font-mono uppercase tracking-wider ${
        accent ? "font-bold text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
      }`}
    >
      {label}
    </legend>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </fieldset>
);

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`min-h-[36px] shrink-0 rounded-xl border px-3 text-[11px] font-semibold transition-colors ${
      active
        ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
    }`}
  >
    {children}
  </button>
);

export default TransactionFiltersSheet;
