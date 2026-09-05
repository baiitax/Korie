'use client';

/**
 * The compliance table.
 *
 * One implementation for every queue so the rules stay true everywhere: sticky
 * header, sortable columns that announce their direction, pagination instead of
 * an infinite wall of rows, a keyboard path to every record, and a card layout
 * under `md` rather than a sideways-scrolling table.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { SortGlyph } from './Primitives';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'start' | 'end';
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  hideBelow?: 'sm' | 'md' | 'lg';
  width?: string;
  /** Shown as the label above this cell in the mobile card layout. */
  mobileLabel?: string;
  /** When omitted the column is omitted from the card layout. */
  primary?: boolean;
}

export interface TableLabels {
  caption: string;
  sortHint: string;
  previous: string;
  next: string;
  showing: (from: number, to: number, total: number) => string;
  page: (page: number, of: number) => string;
  open: string;
}

const HIDE_CLASS: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

export function ComplianceTable<T>({
  rows,
  columns,
  getRowId,
  getRowHref,
  getRowTone,
  pageSize = 15,
  labels,
  toolbar,
  footnote,
  initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  getRowHref?: (row: T) => string | undefined;
  getRowTone?: (row: T) => 'critical' | 'high' | undefined;
  pageSize?: number;
  labels: TableLabels;
  toolbar?: React.ReactNode;
  footnote?: React.ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: 'asc' };
      if (current.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <section className="cmp-card cmp-card--flush">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-2.5">{toolbar}</div>
      ) : null}

      {/* Desktop / tablet: the real table. */}
      <div className="cmp-tablewrap hidden md:block" tabIndex={0} role="region" aria-label={labels.caption}>
        <table className="cmp-table">
          <caption className="sr-only">{labels.caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const sortable = Boolean(column.sortValue);
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    data-align={column.align}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                    className={column.hideBelow ? HIDE_CLASS[column.hideBelow] : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        title={labels.sortHint}
                        className="hover:text-[var(--foreground)]"
                      >
                        <span>{column.header}</span>
                        <SortGlyph direction={active ? sort!.dir : null} />
                      </button>
                    ) : (
                      <span>{column.header}</span>
                    )}
                  </th>
                );
              })}
              {getRowHref ? <th scope="col" className="w-[44px]" /> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const href = getRowHref?.(row);
              const tone = getRowTone?.(row);
              return (
                <tr
                  key={getRowId(row)}
                  data-clickable={href ? 'true' : undefined}
                  style={tone === 'critical' ? { boxShadow: 'inset 3px 0 0 var(--sev-critical)' } : tone === 'high' ? { boxShadow: 'inset 3px 0 0 var(--sev-high)' } : undefined}
                  onClick={href ? () => { window.location.href = href; } : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-align={column.align}
                      className={column.hideBelow ? HIDE_CLASS[column.hideBelow] : undefined}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {href ? (
                    <td className="text-right">
                      <Link
                        href={href}
                        aria-label={labels.open}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-[var(--border-strong)] text-[var(--foreground-muted)] hover:border-[var(--brand-border)] hover:text-[var(--brand-primary)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards, not a table you have to rotate the phone for. */}
      <ul className="divide-y divide-[var(--border)] md:hidden">
        {visible.map((row) => {
          const href = getRowHref?.(row);
          const primary = columns.filter((c) => c.primary);
          const rest = columns.filter((c) => !c.primary && c.mobileLabel);
          return (
            <li key={getRowId(row)} className="relative p-3">
              {primary.length ? (
                <div className="space-y-1">{primary.map((c) => <div key={c.key}>{c.render(row)}</div>)}</div>
              ) : (
                <div>{columns[0]?.render(row)}</div>
              )}
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <div className="cmp-dl__term">{c.mobileLabel}</div>
                    <div className="mt-0.5 text-[12.5px] text-[var(--foreground)]">{c.render(row)}</div>
                  </div>
                ))}
              </div>
              {href ? (
                <Link
                  href={href}
                  className="cmp-btn mt-2.5 w-full"
                  aria-label={labels.open}
                >
                  {labels.open}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2">
        <p className="text-[11.5px] tabular text-[var(--foreground-muted)]">
          {labels.showing(start + 1, Math.min(start + pageSize, sorted.length), sorted.length)}
        </p>
        <div className="flex items-center gap-1.5">
          {footnote ? <span className="mr-1 text-[11.5px] text-[var(--muted)]">{footnote}</span> : null}
          <button
            type="button"
            className="cmp-btn cmp-btn--icon"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label={labels.previous}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-[11.5px] tabular text-[var(--muted)]" aria-live="polite">
            {labels.page(safePage + 1, pageCount)}
          </span>
          <button
            type="button"
            className="cmp-btn cmp-btn--icon"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label={labels.next}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  );
}

/**
 * Filter bar shared by every queue: a search field plus selects, and a
 * "clear filters" button that only appears when a filter is actually active —
 * so "no results" always tells you whether the queue is empty or you filtered
 * it away.
 */
export const TableToolbar: React.FC<{
  searchValue: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  children?: React.ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  resultCount?: number;
  resultLabel?: (count: number) => string;
}> = ({ searchValue, onSearch, searchLabel, searchPlaceholder, children, onClear, clearLabel, resultCount, resultLabel }) => (
  <div className="flex w-full flex-wrap items-center gap-2">
    <div className="relative min-w-[190px] flex-1">
      <label className="sr-only" htmlFor="cmp-table-search">
        {searchLabel}
      </label>
      <input
        id="cmp-table-search"
        type="search"
        value={searchValue}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={searchPlaceholder}
        className="h-[38px] w-full rounded-[var(--cmp-radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] pl-3 pr-3 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-disabled)]"
      />
    </div>
    {children}
    {onClear && clearLabel ? (
      <button type="button" className="cmp-btn" onClick={onClear}>
        {clearLabel}
      </button>
    ) : null}
    {typeof resultCount === 'number' && resultLabel ? (
      <span className="text-[11.5px] tabular text-[var(--muted)]" aria-live="polite">
        {resultLabel(resultCount)}
      </span>
    ) : null}
  </div>
);

/** Table labels come from the portal locale, so the kit stays translation-free. */
export function makeTableLabels(
  t: (key: string, params?: Record<string, string | number>) => string,
  caption: string,
): TableLabels {
  return {
    caption,
    sortHint: t('compliance.table.sort', { column: '' }).replace(/:?\s*$/, ''),
    previous: t('compliance.table.previous'),
    next: t('compliance.table.next'),
    showing: (from, to, total) => t('compliance.table.showing', { from, to, total }),
    page: (page, of) => t('compliance.table.page', { page, of }),
    open: t('compliance.table.open'),
  };
}
