"use client";

import Link from "next/link";
import React from "react";
import { AlertTriangle, RefreshCw, Inbox, Clock, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/loading/KpaySkeleton";
import KpayInlineLoader from "@/components/loading/KpayInlineLoader";
import type { NormalizedCustomerError } from "@/lib/customer/customerApiError";

/**
 * The three non-happy states every data screen must distinguish.
 *
 * §16 of the brief makes this mandatory: an API failure and a genuinely empty
 * account look identical in most portals, and in a banking app that ambiguity
 * is the difference between "retry" and "where is my money?". These components
 * make it impossible to render one as the other.
 */

export const TransactionHistorySkeleton: React.FC<{ rows?: number; label: string }> = ({
  rows = 5,
  label,
}) => (
  <div role="status" aria-live="polite" aria-busy="true" className="divide-y divide-[var(--border)]">
    <span className="sr-only">{label}</span>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-3.5" aria-hidden="true">
        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-1/3" />
        </div>
        <div className="space-y-1.5 items-end flex flex-col">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
    ))}
  </div>
);

/** Failure: never the same screen as "nothing here". */
export const DataErrorState: React.FC<{
  error: NormalizedCustomerError;
  onRetry?: () => void;
  retryLabel: string;
  /** e.g. "transactions" — drives the icon + the reassurance line. */
  surface?: "transactions" | "verification" | "notifications" | "generic";
}> = ({ error, onRetry, retryLabel, surface = "generic" }) => {
  const Icon = error.kind === "FORBIDDEN" || error.kind === "UNAUTHENTICATED" ? ShieldAlert : AlertTriangle;
  const reassurance =
    surface === "transactions"
      ? "Your account and funds are not affected."
      : surface === "verification"
        ? "Your submitted documents are safe with us."
        : null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)]/40 p-5 text-center space-y-3"
    >
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <Icon className="h-5 w-5 text-[var(--danger)]" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-bold text-[var(--foreground)]">{error.message}</p>
        {reassurance && (
          <p className="text-xs text-[var(--foreground-muted)]">{reassurance}</p>
        )}
      </div>
      {error.retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
      {error.fieldErrors?.length ? (
        <ul className="text-[11px] text-[var(--danger)] space-y-0.5">
          {error.fieldErrors.map((f, i) => (
            <li key={i}>{f.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** Genuinely empty, and worded so it cannot be mistaken for a failure. */
export const DataEmptyState: React.FC<{
  title: string;
  hint?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}> = ({ title, hint, action }) => (
  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-7 text-center space-y-3">
    <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
      <Inbox className="h-5 w-5 text-[var(--foreground-muted)]" aria-hidden="true" />
    </span>
    <p className="text-sm font-bold text-[var(--foreground)]">{title}</p>
    {hint && <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">{hint}</p>}
    {action &&
      (action.href ? (
        <Link
          href={action.href}
          className="inline-block rounded-xl bg-[var(--brand-primary)] px-3.5 py-2 text-xs font-bold text-white"
        >
          {action.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-xl bg-[var(--brand-primary)] px-3.5 py-2 text-xs font-bold text-white"
        >
          {action.label}
        </button>
      ))}
  </div>
);

/**
 * "Last updated" + manual refresh. Deliberately a timestamp rather than a
 * countdown: it reports when data was true, which is all a customer can be
 * honestly told without a push channel.
 */
export const DataFreshnessBar: React.FC<{
  updatedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  updatedLabel: string;
  refreshLabel: string;
  lang: string;
}> = ({ updatedAt, onRefresh, isRefreshing, updatedLabel, refreshLabel, lang }) => {
  const stamp = updatedAt
    ? new Date(updatedAt).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--foreground-muted)]">
      <span className="inline-flex items-center gap-1.5 font-mono">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {updatedLabel} <span className="text-[var(--foreground)] font-bold">{stamp}</span>
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] disabled:opacity-60 transition-colors min-h-[32px]"
        aria-label={refreshLabel}
      >
        {isRefreshing ? <KpayInlineLoader size="xs" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
        {refreshLabel}
      </button>
    </div>
  );
};

export default { DataErrorState, DataEmptyState, TransactionHistorySkeleton, DataFreshnessBar };
