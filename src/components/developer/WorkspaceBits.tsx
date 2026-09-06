"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy, RefreshCw, Inbox } from "lucide-react";
import type { DeveloperEnvironment, HttpMethod } from "@/types/developer";

/* Lightweight shared presentational bits for the developer workspace pages
 * (W2). Localized copy arrives in a later i18n pass. */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => (
  <div
    className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] ${className}`}
    {...props}
  />
);

export const CardHeader: React.FC<{ title: string; aside?: React.ReactNode }> = ({
  title,
  aside,
}) => (
  <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
    <h2 className="text-sm font-bold text-[var(--foreground)]">{title}</h2>
    {aside}
  </div>
);

export const CopyButton: React.FC<{ text: string; label?: string; className?: string }> = ({
  text,
  label = "Copy",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`${label}: ${text}`}
      className={`inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] ${className}`}
    >
      {copied ? <Check className="w-3 h-3 text-[var(--brand-primary)]" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
};

export const MethodBadge: React.FC<{ method: HttpMethod }> = ({ method }) => {
  const color =
    method === "GET"
      ? "bg-sky-500/10 text-sky-600"
      : method === "POST"
        ? "bg-emerald-500/10 text-[var(--brand-primary)]"
        : method === "DELETE"
          ? "bg-rose-500/10 text-rose-600"
          : "bg-amber-500/10 text-amber-600";
  return (
    <span className={`inline-flex w-12 justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${color}`}>
      {method}
    </span>
  );
};

export const EnvChip: React.FC<{ env: DeveloperEnvironment; className?: string }> = ({ env, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
      env === "PRODUCTION" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-[var(--brand-primary)]"
    } ${className}`}
  >
    <span className={`w-1 h-1 rounded-full ${env === "PRODUCTION" ? "bg-amber-500" : "bg-[var(--brand-primary)]"}`} />
    {env}
  </span>
);

export const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === "ACTIVE"
      ? "bg-emerald-500/15 text-[var(--brand-primary)]"
      : status === "ROTATING" || status === "DEPRECATED"
        ? "bg-amber-500/15 text-amber-600"
        : status === "REVOKED" || status === "FAILED"
          ? "bg-rose-500/15 text-rose-600"
          : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]";
  return (
    <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
};

export const LoadingRows: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3 p-4" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="h-6 w-12 rounded-md bg-[var(--surface-elevated)]" />
        <div className="h-4 flex-1 rounded-md bg-[var(--surface-elevated)]" />
        <div className="h-4 w-24 rounded-md bg-[var(--surface-elevated)]" />
      </div>
    ))}
  </div>
);

export const ErrorState: React.FC<{ title: string; message?: string; onRetry: () => void }> = ({
  title,
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)]/40 px-6 py-8 text-center" role="alert">
    <p className="text-sm font-bold text-[var(--danger)]">{title}</p>
    {message && <p className="max-w-md text-xs text-[var(--foreground-muted)]">{message}</p>}
    <button
      type="button"
      onClick={onRetry}
      className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
    >
      <RefreshCw className="w-3.5 h-3.5" /> Retry
    </button>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}> = ({ title, description, actionHref, actionLabel }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)]">
      <Inbox className="w-5 h-5" aria-hidden="true" />
    </span>
    <p className="text-sm font-bold text-[var(--foreground)]">{title}</p>
    <p className="max-w-sm text-xs text-[var(--foreground-muted)]">{description}</p>
    {actionHref && actionLabel && (
      <Link
        href={actionHref}
        className="mt-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:opacity-90"
      >
        {actionLabel}
      </Link>
    )}
  </div>
);

export const primaryLink =
  "inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3.5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
export const ghostLink =
  "inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]";
