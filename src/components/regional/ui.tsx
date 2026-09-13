"use client";

import React from "react";
import { useRegional } from "./RegionalContext";
import { RefreshCw, Inbox, Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Shared primitives for the Regional portal. One visual language.     */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  onRefresh,
  refreshing,
  children,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--foreground-muted)] mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "good" | "bad";
}) {
  const toneClass =
    tone === "warn" ? "text-amber-500" : tone === "good" ? "text-[var(--brand-primary)]" : tone === "bad" ? "text-rose-500" : "text-[var(--foreground)]";
  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-[var(--foreground-muted)] min-w-0">
        {Icon && <Icon className="w-4 h-4 shrink-0" />}
        <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className={`text-xl sm:text-2xl font-bold truncate ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-[var(--foreground-muted)] truncate">{hint}</div>}
    </div>
  );
}

export function Pill({ kind, children }: { kind: "ok" | "warn" | "bad" | "muted" | "info"; children: React.ReactNode }) {
  const map = {
    ok: "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-border)]",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    bad: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    muted: "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border)]",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${map[kind]}`}>{children}</span>;
}

export function statusPillKind(status: string): "ok" | "warn" | "bad" | "muted" | "info" {
  const s = (status || "").toUpperCase();
  if (["ACTIVE", "SUCCESSFUL", "COMPLETED", "VERIFIED", "APPROVED", "HEALTHY", "RESOLVED", "CLOSED", "SETTLED", "PENDING"].includes(s) === false) {
    if (["SUSPENDED", "REJECTED", "FAILED", "CRITICAL", "RESTRICTED", "DISPUTED", "FROZEN", "CANCELLED"].includes(s)) return "bad";
    if (["LOW", "REVIEW", "ESCALATED", "URGENT", "CRITICAL", "MONITOR"].includes(s)) return "warn";
  }
  if (["ACTIVE", "SUCCESSFUL", "COMPLETED", "VERIFIED", "APPROVED", "HEALTHY", "RESOLVED", "CLOSED", "SETTLED"].includes(s)) return "ok";
  if (["PENDING", "PROCESSING", "INITIATED", "NEW", "TRIAGED", "IN_REVIEW", "ASSIGNED", "IN_PROGRESS", "MONITOR"].includes(s)) return "info";
  return "muted";
}

export function EmptyState({ icon: Icon = Inbox, title, body }: { icon?: React.ElementType; title: string; body?: string }) {
  return (
    <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
      <Icon className="w-8 h-8 mx-auto text-[var(--foreground-muted)] mb-3" />
      <div className="text-sm font-semibold">{title}</div>
      {body && <p className="text-xs text-[var(--foreground-muted)] mt-1 max-w-md mx-auto">{body}</p>}
    </div>
  );
}

export function PlannedBadge({ label }: { label: string }) {
  const { t } = useRegional();
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-dashed border-[var(--border)] text-[var(--foreground-muted)] bg-[var(--surface-elevated)]">
      <Sparkles className="w-3 h-3" />
      {label} · {t("common.planned")}
    </span>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
      ))}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useRegional();
  return (
    <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500 flex items-center justify-between gap-3">
      <span>{message || t("common.error")}</span>
      {onRetry && (
        <button onClick={onRetry} className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-xs font-bold hover:bg-rose-500/10">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const { t } = useRegional();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <span className="text-[11px] text-[var(--foreground-muted)]">{t("common.total", { count: total })}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] disabled:opacity-40"
        >
          {t("common.prev")}
        </button>
        <span className="text-xs text-[var(--foreground-muted)]">{t("common.page", { page, pageCount })}</span>
        <button
          onClick={() => onPage(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] disabled:opacity-40"
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}

/* A dependency-free SVG sparkline/area chart — lazy, cheap, no external
 * chart library, colors from theme tokens. */
export function TrendChart({
  series,
  currency,
  height = 120,
}: {
  series: { date: string; count: number; volume: number }[];
  currency: string;
  height?: number;
}) {
  const { formatCurrency } = useRegional();
  const w = 560;
  const h = height;
  const pad = 6;
  const max = Math.max(1, ...series.map((p) => p.volume));
  const step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const pts = series.map((p, i) => `${pad + i * step},${h - pad - (p.volume / max) * (h - pad * 2)}`);
  const area = `M${pad},${h - pad} L${pts.join(" L")} L${pad + (series.length - 1) * step},${h - pad} Z`;
  const last = series[series.length - 1];
  return (
    <div className="min-w-0">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label={`30-day ${currency} volume trend`}>
        <path d={area} fill="var(--brand-primary)" opacity="0.12" />
        <polyline points={pts.join(" ")} fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-[var(--foreground-muted)] mt-1">
        <span>{series[0]?.date.slice(5)}</span>
        <span>
          {last ? formatCurrency(last.volume, currency) : "—"} · {last?.count ?? 0}
        </span>
        <span>{last?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function KeyValue({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
      {rows.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[var(--foreground-muted)] truncate">{k}</dt>
          <dd className="font-semibold truncate">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
