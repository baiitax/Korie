"use client";

// =============================================================================
// File: src/components/support/SupportUI.tsx
// Description: KoriePay Support — shared display primitives (§108).
// Everything renders through .kp-support tokens; no raw hex anywhere.
// =============================================================================

import React, { useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox as InboxIcon,
  Loader2,
  PauseCircle,
  SearchX,
  WifiOff,
  X,
} from "lucide-react";

/* ------------------------------------------------------------- formatters */

export function fmtMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  const rounded = Math.round(amount * 100) / 100;
  const symbol = currency === "XOF" ? "CFA" : currency === "NGN" ? "₦" : `${currency} `;
  const num = rounded.toLocaleString("en-NG", { maximumFractionDigits: currency === "NGN" && rounded % 1 !== 0 ? 2 : 0 });
  return currency === "XOF" ? `${num} CFA` : `${symbol}${num}`;
}

export function relTime(iso: string | undefined, t: (k: string, p?: Record<string, string | number>) => string): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(Math.abs(diffMs) / 60000);
  const hrs = Math.round(mins / 60);
  const days = Math.round(hrs / 24);
  const past = diffMs >= 0;
  const label =
    mins < 1 ? t("supportOps.time.now")
    : mins < 60 ? t(past ? "supportOps.time.minsAgo" : "supportOps.time.inMin", { count: mins })
    : hrs < 24 ? t(past ? "supportOps.time.hrsAgo" : "supportOps.time.inHr", { count: hrs })
    : t(past ? "supportOps.time.daysAgo" : "supportOps.time.inDay", { count: days });
  return label;
}

export function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return mins % 60 >= 10 ? `${hrs}h ${mins % 60}m` : `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/* ---------------------------------------------------------------- badges */

const STATUS_TONES: Record<string, string> = {
  NEW: "info", TRIAGED: "info", ASSIGNED: "info", IN_PROGRESS: "info",
  WAITING_FOR_CUSTOMER: "paused", WAITING_FOR_INTERNAL_TEAM: "paused",
  ESCALATED: "warning", RESOLVED: "success", CLOSED: "neutral", REOPENED: "warning",
};

const PRIORITY_TONES: Record<string, string> = {
  LOW: "neutral", NORMAL: "info", HIGH: "warning", URGENT: "warning", CRITICAL: "danger",
};

const SLA_TONES: Record<string, string> = {
  ON_TRACK: "success", AT_RISK: "warning", BREACHED: "danger", PAUSED: "paused",
  RESOLVED: "success", MISSED: "danger",
};

const TONE_CLASSES: Record<string, string> = {
  success: "bg-[var(--state-success-soft)] text-[var(--state-success)]",
  warning: "bg-[var(--state-warning-soft)] text-[var(--state-warning)]",
  danger: "bg-[var(--state-danger-soft)] text-[var(--state-danger)]",
  info: "bg-[var(--state-info-soft)] text-[var(--state-info)]",
  neutral: "bg-[var(--state-neutral-soft)] text-[var(--state-neutral)]",
  paused: "bg-[var(--state-paused-soft)] text-[var(--state-paused)]",
};

export function ToneBadge({ tone, children, title }: { tone: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--support-radius-chip)] px-2.5 py-0.5 text-[11px] font-bold ${TONE_CLASSES[tone] ?? TONE_CLASSES.neutral}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const tone = STATUS_TONES[status] ?? "neutral";
  return <ToneBadge tone={tone}>{t(`supportOps.statuses.${status}`) ?? status}</ToneBadge>;
}

export function PriorityBadge({ priority, t }: { priority: string; t: (k: string) => string }) {
  const tone = PRIORITY_TONES[priority] ?? "neutral";
  return <ToneBadge tone={tone}>{t(`supportOps.priorities.${priority}`) ?? priority}</ToneBadge>;
}

export function SlaBadge({ state, t, extra }: { state: string; t: (k: string) => string; extra?: string }) {
  const tone = SLA_TONES[state] ?? "neutral";
  const label = t(`supportOps.sla.${state.toLowerCase()}`) ?? state;
  return (
    <ToneBadge tone={tone}>
      {state === "ON_TRACK" && <Clock className="h-3 w-3" />}
      {state === "PAUSED" && <PauseCircle className="h-3 w-3" />}
      {state === "AT_RISK" && <AlertTriangle className="h-3 w-3" />}
      {label}
      {extra ? <span className="font-semibold opacity-80">· {extra}</span> : null}
    </ToneBadge>
  );
}

export function RiskBadge({ level, t }: { level: string; t: (k: string) => string }) {
  const tone = level === "HIGH" ? "danger" : level === "MEDIUM" ? "warning" : "success";
  const key = level === "HIGH" ? "riskHigh" : level === "MEDIUM" ? "riskMedium" : "riskLow";
  return <ToneBadge tone={tone}>{t(`supportOps.customers.${key}`)}</ToneBadge>;
}

export function HealthDot({ status }: { status: string }) {
  const cls =
    status === "OPERATIONAL" ? "bg-[var(--state-success)]"
    : status === "DEGRADED" ? "bg-[var(--state-warning)]"
    : "bg-[var(--state-danger)]";
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

/* ------------------------------------------------------------------ cards */

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  tone,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "danger" | "warning";
}) {
  return (
    <section
      className={`rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm backdrop-blur-[var(--glass-blur-01)] sm:p-5 ${
        tone === "danger" ? "border-[var(--state-danger)]/40" : tone === "warning" ? "border-[var(--state-warning)]/40" : ""
      } ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "neutral" | "danger" | "warning" | "success" | "info";
  onClick?: () => void;
}) {
  const accent =
    tone === "danger" ? "text-[var(--state-danger)]"
    : tone === "warning" ? "text-[var(--state-warning)]"
    : tone === "success" ? "text-[var(--state-success)]"
    : tone === "info" ? "text-[var(--state-info)]"
    : "text-[var(--foreground)]";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-left shadow-sm backdrop-blur-[var(--glass-blur-01)] ${
        onClick ? "cursor-pointer transition-colors hover:border-[var(--brand-border)]" : ""
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--foreground-muted)]">{sub}</p>}
    </Tag>
  );
}

/* ------------------------------------------------------------------ states */

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-[var(--brand-primary)] ${className}`} aria-label="loading" />;
}

export function LoadingPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-[var(--surface-3)]"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--support-radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-6 py-10 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)]">
        {icon ?? <InboxIcon className="h-5 w-5" />}
      </div>
      <p className="text-sm font-bold text-[var(--foreground)]">{title}</p>
      {hint && <p className="max-w-sm text-xs text-[var(--foreground-muted)]">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--support-radius-card)] border border-[var(--state-danger)]/30 bg-[var(--state-danger-soft)] px-6 py-8 text-center" role="alert">
      <AlertTriangle className="h-6 w-6 text-[var(--state-danger)]" />
      <p className="text-sm font-bold text-[var(--state-danger)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-[var(--support-radius-input)] bg-[var(--state-danger)] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function OfflineBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--support-radius-input)] border border-[var(--state-warning)]/40 bg-[var(--state-warning-soft)] px-3 py-2 text-xs font-semibold text-[var(--state-warning)]" role="status">
      <WifiOff className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export function NoResults({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--foreground-muted)]">
      <SearchX className="h-5 w-5 shrink-0 text-[var(--muted)]" />
      <div>
        <p className="font-bold text-[var(--foreground)]">{title}</p>
        {hint && <p className="mt-0.5 text-xs">{hint}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--card-border)] bg-[var(--surface)] shadow-2xl backdrop-blur-[var(--glass-blur-modal)] sm:rounded-[var(--support-radius-card)] ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        }`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-5 py-3 backdrop-blur">
          <h2 className="text-sm font-extrabold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ helper */

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function successIcon() {
  return <CheckCircle2 className="h-4 w-4" />;
}
