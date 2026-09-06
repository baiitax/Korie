"use client";

import React from "react";

/**
 * Shared building blocks for admin module pages: header, stat cards, money
 * formatting. Kept intentionally small — pages compose these with
 * ResourceTable to render real database data.
 */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
      <div>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
          {eyebrow}
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] mt-1">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--foreground-muted)] mt-0.5 max-w-2xl">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function fmtMoney(amount: unknown, currency?: unknown): string {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount ?? "0"));
  if (!isFinite(n)) return "—";
  const cur = String(currency ?? "").toUpperCase();
  const sym = cur === "NGN" ? "₦" : cur === "XOF" || cur === "XAF" ? "CFA " : cur ? `${cur} ` : "";
  return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function fmtDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtAgo(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function TextCell({ value, mono = true }: { value: unknown; mono?: boolean }) {
  const s = value === null || value === undefined || value === "" ? "—" : String(value);
  return <span className={`${mono ? "font-mono" : ""} text-[var(--foreground)]/90 break-words`}>{s}</span>;
}

/**
 * Stats computed from the loaded rows of a live table — the label says so.
 * No page invents totals it didn't read.
 */
export function StatsFromRows({
  rows,
  stats,
  contextLabel,
}: {
  rows: Record<string, unknown>[];
  stats: { label: string; compute: (rows: Record<string, unknown>[]) => string }[];
  contextLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">{s.label}</p>
          <p className="mt-1 text-lg font-extrabold text-[var(--foreground)] tabular-nums">{s.compute(rows)}</p>
        </div>
      ))}
      <p className="col-span-2 lg:col-span-4 text-[10px] text-[var(--foreground-muted)] font-mono">
        Computed from the {rows.length} records loaded below · {contextLabel}
      </p>
    </div>
  );
}
