"use client";

// =============================================================================
// File: src/app/support/inbox/page.tsx
// Description: Inbox — the daily working surface (spec §17/§18).
//
// Desktop: filter bar + queue + live ticket preview pane (3 panes,
// spec §17). The queue is URL-driven (?status=&priority=&q=…) so views are
// shareable and bookmarkable; the preview pane shows the selected ticket's
// conversation, customer and related transaction at a glance — the
// full workspace lives at /support/tickets/[id].
// Mobile: the queue with tappable rows; preview becomes the detail page.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, SlidersHorizontal, User } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import {
  ErrorState,
  LoadingPanel,
  OfflineBanner,
  PriorityBadge,
  SlaBadge,
  StatusBadge,
  EmptyState,
  relTime,
} from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, TicketDto } from "@/services/supportOpsClient";

export default function InboxPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [status, setStatus] = useState(params.get("status") ?? "");
  const [priority, setPriority] = useState(params.get("priority") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [jurisdiction, setJurisdiction] = useState(params.get("jurisdiction") ?? "");
  const [unassigned, setUnassigned] = useState(params.get("unassigned") === "1");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [openOnly, setOpenOnly] = useState(params.get("open") === "1" || !params.get("status"));

  // Keep the filter state in the URL (shareable views).
  useEffect(() => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (priority) sp.set("priority", priority);
    if (category) sp.set("category", category);
    if (jurisdiction) sp.set("jurisdiction", jurisdiction);
    if (unassigned) sp.set("unassigned", "1");
    if (q) sp.set("q", q);
    if (openOnly && !status) sp.set("open", "1");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [status, priority, category, jurisdiction, unassigned, q, openOnly, router, pathname]);

  const [rows, setRows] = useState<TicketDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query: Record<string, string> = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (jurisdiction) query.jurisdiction = jurisdiction;
    if (unassigned) query.unassigned = "1";
    if (q) query.q = q;
    if (openOnly && !status) query.open = "1";
    const res = await supportOps.tickets(query, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setTotal(res.total);
    setLoading(false);
  }, [status, priority, category, jurisdiction, unassigned, q, openOnly, activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const selected = useMemo(() => rows?.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const selectCls =
    "rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--brand-border)]";

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.inbox.title")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">
            {loading || !rows ? "" : `${total} ${t("supportOps.inbox.queueTitle").toLowerCase()}`}
          </p>
        </div>
        {total > 0 && !loading && (
          <button
            onClick={() => router.push("/support/tickets")}
            className="flex items-center gap-1 text-xs font-extrabold text-[var(--brand-primary)] hover:underline"
          >
            {t("supportOps.nav.tickets")} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 backdrop-blur-[var(--glass-blur-01)]">
        <span className="hidden items-center gap-1.5 pr-1 text-xs font-extrabold text-[var(--muted)] sm:flex">
          <SlidersHorizontal className="h-3.5 w-3.5" /> {t("supportOps.common.filter")}
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("supportOps.inbox.filters.searchPlaceholder")}
          aria-label={t("supportOps.inbox.filters.searchPlaceholder")}
          className="min-w-[180px] flex-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand-border)]"
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
        <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} aria-label={t("supportOps.inbox.filters.jurisdiction")} className={selectCls}>
          <option value="">{t("supportOps.inbox.filters.jurisdiction")}: {t("supportOps.common.all")}</option>
          {["NG", "NE", "CROSS_BORDER"].map((j) => (
            <option key={j} value={j}>{t(`supportOps.jurisdictions.${j}`)}</option>
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

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Queue */}
        <div className="lg:col-span-3">
          {loading && <LoadingPanel rows={7} />}
          {error && <ErrorState message={error} onRetry={() => void load()} />}
          {!loading && !error && rows && rows.length === 0 && (
            <EmptyState title={t("supportOps.inbox.noTickets")} hint={t("supportOps.inbox.noTicketsHint")} />
          )}
          {!loading && !error && rows && rows.length > 0 && (
            <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
              {/* Column headers (desktop) */}
              <div className="hidden grid-cols-[1fr_110px_110px_120px_90px] gap-2 border-b border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] md:grid">
                <span>{t("supportOps.inbox.ticket")}</span>
                <span>{t("supportOps.inbox.filters.priority")}</span>
                <span>SLA</span>
                <span>{t("supportOps.inbox.customer")}</span>
                <span>{t("supportOps.inbox.updated")}</span>
              </div>
              {rows.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setSelectedId(ticket.id);
                    if (window.innerWidth < 1024) router.push(`/support/tickets/${ticket.id}`);
                  }}
                  className={`grid w-full grid-cols-1 gap-1.5 border-b border-[var(--card-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-2)] md:grid-cols-[1fr_110px_110px_120px_90px] md:items-center md:gap-2 ${
                    selectedId === ticket.id ? "bg-[var(--brand-soft)]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-extrabold text-[var(--foreground)]">{ticket.ticketNumber}</span>
                      <StatusBadge status={ticket.status} t={t} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">{ticket.subject}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--muted)] md:hidden">
                      {t(`supportOps.priorities.${ticket.priority}`)} · {ticket.customerName}
                    </p>
                  </div>
                  <div className="hidden md:block"><PriorityBadge priority={ticket.priority} t={t} /></div>
                  <div className="hidden md:block">
                    {ticket.sla ? (
                      <SlaBadge
                        state={ticket.sla.state}
                        t={t}
                        extra={ticket.sla.state === "BREACHED" || ticket.sla.state === "AT_RISK" ? ticket.sla.remainingMs > 0 ? fmtDurationLabel(ticket.sla.remainingMs) : undefined : undefined}
                      />
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">—</span>
                    )}
                  </div>
                  <div className="hidden min-w-0 md:block">
                    <p className="truncate text-xs font-semibold text-[var(--foreground)]">{ticket.customerName}</p>
                    {ticket.assignedOfficerName ? (
                      <p className="truncate text-[10px] text-[var(--muted)]">{ticket.assignedOfficerName}</p>
                    ) : (
                      <p className="text-[10px] font-bold text-[var(--state-warning)]">{t("supportOps.inbox.unassigned")}</p>
                    )}
                  </div>
                  <span className="hidden text-[11px] font-semibold tabular-nums text-[var(--muted)] md:block">{relTime(ticket.updatedAt, t)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview pane (desktop) */}
        <div className="hidden lg:col-span-2 lg:block">
          {!selected ? (
            <div className="sticky top-24">
              <EmptyState title={t("supportOps.inbox.selectTicket")} />
            </div>
          ) : (
            <Link
              href={`/support/tickets/${selected.id}`}
              className="sticky top-24 block rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 backdrop-blur-[var(--glass-blur-01)] transition-colors hover:border-[var(--brand-border)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[var(--muted)]">{selected.ticketNumber}</p>
                  <h2 className="mt-0.5 text-sm font-extrabold leading-snug text-[var(--foreground)]">{selected.subject}</h2>
                </div>
                <StatusBadge status={selected.status} t={t} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={selected.priority} t={t} />
                {selected.sla && <SlaBadge state={selected.sla.state} t={t} />}
                <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--foreground-muted)]">
                  {t(`supportOps.jurisdictions.${selected.jurisdiction}`)}
                </span>
              </div>

              <div className="mt-3 rounded-[10px] bg-[var(--surface-2)] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--muted)]">
                  <User className="h-3.5 w-3.5" /> {selected.customerName}
                  {selected.sla && selected.sla.state === "PAUSED" && (
                    <span className="ml-auto font-bold text-[var(--state-paused)]">{t("supportOps.sla.pausedFor")}</span>
                  )}
                </p>
                <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-[var(--foreground-muted)]">
                  {selected.description}
                </p>
              </div>

              {selected.messages && selected.messages.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selected.messages.slice(-3).map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-[10px] px-3 py-2 text-xs ${
                        m.isInternalNote
                          ? "border border-dashed border-[var(--state-warning)]/40 bg-[var(--state-warning-soft)]"
                          : m.senderType === "CUSTOMER"
                            ? "bg-[var(--surface-3)]"
                            : "bg-[var(--brand-soft)]"
                      }`}
                    >
                      <p className="text-[10px] font-extrabold text-[var(--muted)]">
                        {t(`supportOps.ticket.${m.senderType === "CUSTOMER" ? "customer" : m.isInternalNote ? "internal" : "agent"}`)} · {relTime(m.timestamp, t)}
                      </p>
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[var(--foreground)]">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {selected.relatedTransactionId && (
                <Link
                  href={`/support/transactions/${selected.relatedTransactionId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold text-[var(--brand-primary)] hover:border-[var(--brand-border)]"
                >
                  {t("supportOps.ticket.relatedTransaction")}: {selected.relatedTransactionId}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}

              <p className="mt-3 text-center text-[11px] font-extrabold text-[var(--brand-primary)]">
                {t("supportOps.common.view")} →
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtDurationLabel(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return hrs < 48 ? `${hrs}h ${mins % 60}m` : `${Math.round(hrs / 24)}d`;
}
