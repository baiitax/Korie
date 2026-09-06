"use client";

import React, { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Download, RefreshCw, Inbox, AlertTriangle } from "lucide-react";
import { useAdminResource, AdminResourceError } from "@/lib/admin/useAdminResource";
import { adminApiFetch } from "@/lib/admin/adminSession";

/**
 * ResourceTable — the standard data surface for admin module pages.
 *
 * Every table in the portal renders real database rows fetched through the
 * resource registry. The three honest states are built in:
 *   loading  → skeleton rows (never stale numbers)
 *   error    → the real error message + retry (never "0" pretending all is well)
 *   empty    → "no records" (an empty database stays empty)
 * plus search over the registry's declared columns, whitelisted filters,
 * exact pagination counts and CSV export of the loaded page.
 */

export interface ResourceColumn<T = Record<string, any>> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Hide on small screens to keep tables usable on phones. */
  hideOnMobile?: boolean;
}

export interface ResourceFilterSelect {
  key: string;
  label: string;
  /** Dropdown options come from the database facet endpoint when omitted. */
  options?: string[];
}

interface ResourceTableProps<T = Record<string, any>> {
  resource: string;
  columns: ResourceColumn<T>[];
  filters?: ResourceFilterSelect[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  exportName?: string;
  limit?: number;
  /** Extra filters the page controls (e.g. parent id) — not shown as dropdowns. */
  fixedFilters?: Record<string, string | undefined>;
  initialFilters?: Record<string, string>;
  onRowsLoaded?: (rows: T[], count: number) => void;
}

export function ResourceTable<T extends Record<string, any>>({
  resource,
  columns,
  filters = [],
  searchPlaceholder = "Search…",
  onRowClick,
  emptyMessage = "No records found.",
  exportName,
  limit = 100,
  fixedFilters,
  initialFilters,
  onRowsLoaded,
}: ResourceTableProps<T>) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectFilters, setSelectFilters] = useState<Record<string, string>>(initialFilters ?? {});
  const [offset, setOffset] = useState(0);
  const [facetOptions, setFacetOptions] = useState<Record<string, string[]>>({});

  // Filter dropdown options come from the database (distinct values in
  // recent records) — never a hardcoded enum list.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const needed = filters.filter((f) => !f.options);
      if (!needed.length) return;
      const results = await Promise.all(
        needed.map(async (f) => {
          try {
            const res = await adminApiFetch(`/api/admin/data/${resource}?facet=${f.key}`);
            if (!res.ok) return [f.key, []] as const;
            const body = await res.json();
            return [f.key, (body.values ?? []) as string[]] as const;
          } catch {
            return [f.key, []] as const;
          }
        }),
      );
      if (cancelled) return;
      setFacetOptions(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
    };
  }, [resource, filters]);

  // Debounce search so typing doesn't hammer the API.
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const allFilters = useMemo(
    () => ({ ...fixedFilters, ...selectFilters }),
    [fixedFilters, selectFilters],
  );

  const filterKey = JSON.stringify(allFilters);
  const { rows, count, loading, error, refresh } = useAdminResource<T>(resource, {
    q: debouncedQ,
    filters: useMemo(() => JSON.parse(filterKey || "{}"), [filterKey]),
    limit,
    offset,
  });

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(count / limit));

  const visible = onRowClick;

  const handleExport = () => {
    if (!rows.length) return;
    const headers = columns.map((c) => c.label);
    const lines = rows.map((row) =>
      columns
        .map((c) => {
          const v = row[c.key];
          const s = v === null || v === undefined ? "" : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `koriepay-${exportName ?? resource}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    if (!loading && !error) onRowsLoaded?.(rows, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, rows, count]);

  const cell = (row: T, col: ResourceColumn<T>) =>
    col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—");

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      {(searchPlaceholder || filters.length > 0) && (
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center gap-3 text-xs">
          {searchPlaceholder && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
              />
            </div>
          )}
          {filters.map((f) => (
            <label key={f.key} className="flex items-center gap-2">
              <span className="text-[var(--foreground-muted)] font-mono text-[11px]">{f.label}:</span>
              <select
                value={selectFilters[f.key] ?? "ALL"}
                onChange={(e) => {
                  setSelectFilters((prev) => ({ ...prev, [f.key]: e.target.value }));
                  setOffset(0);
                }}
                className="px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs focus:outline-none focus:border-[var(--brand-primary)]"
              >
                <option value="ALL">All</option>
                {(f.options ?? facetOptions[f.key] ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={refresh}
              className="px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--brand-primary)] text-[var(--foreground-muted)] flex items-center gap-1.5 transition-colors"
              title="Refresh from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {exportName && (
              <button
                onClick={handleExport}
                disabled={!rows.length}
                className="px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--brand-primary)] disabled:opacity-40 text-[var(--foreground-muted)] flex items-center gap-1.5 transition-colors"
                title="Export the loaded page as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-[var(--foreground-muted)] bg-black/20 border-b border-[var(--border)]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`p-4 font-semibold ${c.hideOnMobile ? "hidden md:table-cell" : ""} ${c.className ?? ""}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/50 font-mono">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((c) => (
                      <td key={c.key} className={`p-4 ${c.hideOnMobile ? "hidden md:table-cell" : ""}`}>
                        <div className="h-3 rounded bg-[var(--foreground)]/10" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="p-10">
                    <ErrorState error={error} onRetry={refresh} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-10">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Inbox className="w-8 h-8 text-[var(--foreground-muted)]" />
                      <p className="text-xs font-semibold text-[var(--foreground)]">{emptyMessage}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)] max-w-sm">
                        This is a live view of the database — nothing is simulated here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={String(row.id ?? i)}
                    onClick={visible ? () => onRowClick(row) : undefined}
                    className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-[var(--brand-primary)]/5" : "hover:bg-[var(--foreground)]/[0.03]"}`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`p-4 ${c.hideOnMobile ? "hidden md:table-cell" : ""} ${c.className ?? ""}`}
                      >
                        {cell(row, c)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!error && !loading && count > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-[var(--border)] text-[11px] text-[var(--foreground-muted)] font-mono">
            <span>
              Showing {offset + 1}–{Math.min(offset + limit, count)} of {count.toLocaleString()} records
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:border-[var(--brand-primary)] transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= count}
                className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:border-[var(--brand-primary)] transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: AdminResourceError; onRetry: () => void }) {
  const label =
    error.kind === "unauthenticated" || error.kind === "session"
      ? "Session expired"
      : error.kind === "forbidden"
        ? "Not authorized"
        : error.kind === "backend"
          ? "Backend not configured"
          : error.kind === "not-found"
            ? "Not found"
            : "Query failed";
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <AlertTriangle className="w-8 h-8 text-amber-400" />
      <div>
        <p className="text-xs font-bold text-[var(--foreground)]">{label}</p>
        <p className="mt-1 text-[11px] text-[var(--foreground-muted)] max-w-md">{error.message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-[11px] font-bold hover:bg-[var(--brand-primary-hover)] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/** Status chip with honest color mapping for common states. */
export function StatusChip({ value }: { value: string | null | undefined }) {
  const v = value ?? "UNKNOWN";
  const tone = /^(ACTIVE|SUCCESSFUL|DELIVERED|APPROVED|RESOLVED|COMPLETED|VERIFIED|POSTED|SETTLED|CLOSED|OPERATIONAL|PUBLISHED|EXECUTED|CONFIRMED|DELIVERED|WON)$/.test(v)
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : /^(PENDING|PROCESSING|IN_PROGRESS|UNDER_REVIEW|WAITING_CUSTOMER|QUOTED|DRAFT|FORMING|INVITING_MEMBERS|OPEN_FOR_MEMBERS|UPCOMING|CONTRIBUTING|RETRYING|SCHEDULED|IN_TRANSIT)$/.test(v)
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : /^(FAILED|REJECTED|SUSPENDED|FROZEN|TERMINATED|REVOKED|OPEN|EXPIRED|DISPUTED|CANCELLED|DEFAULTED|CRITICAL|HIGH|OPEN)$/.test(v)
        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
        : "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${tone}`}>
      {v.replaceAll("_", " ")}
    </span>
  );
}

export default ResourceTable;
