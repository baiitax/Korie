"use client";

// =============================================================================
// File: src/app/support/tickets/page.tsx
// Description: Tickets — the full queue with search, filters, sorting and
// pagination (the inbox is the fast working view; this is the complete list).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, PriorityBadge, SlaBadge, StatusBadge, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, TicketDto } from "@/services/supportOpsClient";

const PAGE_SIZE = 25;

export default function TicketsPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [priority, setPriority] = useState(params.get("priority") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [unassigned, setUnassigned] = useState(params.get("unassigned") === "1");
  const [openOnly, setOpenOnly] = useState(!params.get("status") && params.get("open") !== "0");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<TicketDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query: Record<string, string> = { limit: String(PAGE_SIZE * 4) };
    if (q) query.q = q;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (unassigned) query.unassigned = "1";
    if (openOnly && !status) query.open = "1";
    const res = await supportOps.tickets(query);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setTotal(res.total);
    setLoading(false);
  }, [q, status, priority, category, unassigned, openOnly]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  useEffect(() => setPage(1), [q, status, priority, category, unassigned, openOnly]);

  const pageRows = rows ? rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectCls =
    "rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--brand-border)]";

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.tickets")}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{loading || !rows ? "" : `${total} ${t("supportOps.nav.tickets").toLowerCase()}`}</p>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 backdrop-blur-[var(--glass-blur-01)]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("supportOps.inbox.filters.searchPlaceholder")}
          aria-label={t("supportOps.inbox.filters.searchPlaceholder")}
          className="min-w-[200px] flex-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand-border)]"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("supportOps.inbox.filters.status")} className={selectCls}>
          <option value="">{t("supportOps.inbox.filters.status")}: {t("supportOps.common.all")}</option>
          {["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_INTERNAL_TEAM", "ESCALATED", "REOPENED", "RESOLVED", "CLOSED"].map((s) => (
            <option key={s} value={s}>{t(`supportOps.statuses.${s}`)}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label={t("supportOps.inbox.filters.priority")} className={selectCls}>
          <option value="">{t("supportOps.inbox.filters.priority")}: {t("supportOps.common.all")}</option>
          {["CRITICAL", "URGENT", "HIGH", "NORMAL", "LOW"].map((p) => (
            <option key={p} value={p}>{t(`supportOps.priorities.${p}`)}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t("supportOps.inbox.filters.category")} className={selectCls}>
          <option value="">{t("supportOps.inbox.filters.category")}: {t("supportOps.common.all")}</option>
          {["TRANSFER", "CARD", "LOGIN_ACCESS", "PENDING_TRANSACTION", "MERCHANT_SETTLEMENT", "AGENT_FLOAT", "KYC_TIER", "FRAUD_SECURITY", "TECHNICAL_API", "FEE", "OTHER"].map((c) => (
            <option key={c} value={c}>{t(`supportOps.categories.${c}`)}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--brand-primary)]" />
          {t("supportOps.common.open")}
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
          <input type="checkbox" checked={unassigned} onChange={(e) => setUnassigned(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--brand-primary)]" />
          {t("supportOps.inbox.filters.unassignedOnly")}
        </label>
      </div>

      {loading && <LoadingPanel rows={8} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && <EmptyState title={t("supportOps.inbox.noTickets")} hint={t("supportOps.inbox.noTicketsHint")} />}
      {!loading && !error && rows && rows.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
            <div className="hidden grid-cols-[130px_1fr_120px_130px_130px_100px] gap-2 border-b border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] lg:grid">
              <span>{t("supportOps.inbox.ticket")}</span>
              <span>{t("supportOps.inbox.customer")}</span>
              <span>{t("supportOps.common.priority")}</span>
              <span>SLA</span>
              <span>{t("supportOps.common.status")}</span>
              <span>{t("supportOps.inbox.updated")}</span>
            </div>
            {pageRows.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/tickets/${ticket.id}`}
                className="grid grid-cols-2 gap-1.5 border-b border-[var(--card-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-2)] lg:grid-cols-[130px_1fr_120px_130px_130px_100px] lg:items-center lg:gap-2"
              >
                <div>
                  <p className="text-[13px] font-extrabold text-[var(--foreground)]">{ticket.ticketNumber}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--muted)] lg:hidden">
                    {t(`supportOps.priorities.${ticket.priority}`)} · {t(`supportOps.statuses.${ticket.status}`)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[var(--foreground)]">{ticket.subject}</p>
                  <p className="truncate text-[11px] text-[var(--foreground-muted)]">{ticket.customerName} · {t(`supportOps.categories.${ticket.category}`)}</p>
                </div>
                <div className="hidden lg:block"><PriorityBadge priority={ticket.priority} t={t} /></div>
                <div className="hidden lg:block">{ticket.sla && <SlaBadge state={ticket.sla.state} t={t} />}</div>
                <div className="hidden lg:block"><StatusBadge status={ticket.status} t={t} /></div>
                <span className="hidden text-[11px] font-semibold tabular-nums text-[var(--muted)] lg:block">{relTime(ticket.updatedAt, t)}</span>
              </Link>
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label={t("supportOps.common.back")}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-[var(--foreground-muted)]">{page} / {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                aria-label={t("supportOps.common.nextPage")}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
