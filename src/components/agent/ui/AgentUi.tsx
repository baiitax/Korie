// =============================================================================
// Shared UI kit for the agent portal — light, customer-portal design language
// (same state families: skeleton / error / empty / freshness / chips).
// =============================================================================

"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Receipt,
  Landmark,
  CreditCard,
  Wallet,
  Activity,
  RefreshCw,
  AlertTriangle,
  XCircle,
} from "lucide-react";

/* ------------------------------------------------------------- status chips */

export type Tone = "green" | "red" | "amber" | "neutral" | "sky";

const TONE_CHIP: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  neutral: "bg-stone-100 text-stone-600 ring-stone-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function toneForStatus(status: string): Tone {
  const s = String(status || "").toUpperCase();
  if (["SUCCESSFUL", "SETTLED", "MATCHED", "PAID", "ACTIVE", "HEALTHY", "COMPLETED", "VERIFIED", "APPROVED", "RESOLVED"].includes(s)) return "green";
  if (["FAILED", "REJECTED", "SHORT", "SUSPENDED", "RESTRICTED", "CRITICAL", "OVER", "BREACHED", "REVERSED"].includes(s)) return "red";
  if (["PENDING", "PROCESSING", "INITIATED", "LOW", "WATCH", "SUBMITTED", "PARTIALLY_SETTLED", "OPENED", "INVESTIGATING"].includes(s)) return "amber";
  return "neutral";
}

export function AgentChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${TONE_CHIP[tone]}`}
    >
      {label}
    </span>
  );
}

export function statusTone(status: string): Tone {
  return toneForStatus(status);
}

/* ------------------------------------------------------------------ header */

export function AgentPageHeader({
  title,
  subtitle,
  backHref = "/agent",
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="Back to dashboard"
          className="rounded-xl border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition hover:bg-stone-50 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 max-w-2xl text-xs text-stone-500 sm:text-sm">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- stat card */

export function AgentStatCard({
  label,
  value,
  sub,
  icon,
  accent = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "neutral" | "emerald" | "amber" | "rose" | "sky";
}) {
  const accents: Record<string, string> = {
    neutral: "border-stone-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    rose: "border-rose-200 bg-rose-50/60",
    sky: "border-sky-200 bg-sky-50/60",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accents[accent]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
        {icon ? <span className="text-stone-400">{icon}</span> : null}
      </div>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-stone-500">{sub}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ states */

export function AgentPageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-4 sm:p-6" role="status" aria-live="polite">
      <div className="h-8 w-1/2 animate-pulse rounded-lg bg-stone-100" />
      <div className="h-4 w-2/3 animate-pulse rounded-lg bg-stone-100" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-1/3 animate-pulse rounded bg-stone-100" />
          <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-stone-100" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-stone-100" />
        </div>
      ))}
      <p className="sr-only">Loading your agency portal…</p>
    </div>
  );
}

export function AgentErrorState({ title, message, onRetry }: { title: string; message?: string; onRetry: () => void }) {
  return (
    <div className="p-4 sm:p-6">
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <XCircle aria-hidden="true" className="h-8 w-8 text-rose-500" />
        <p className="mt-3 text-sm font-semibold text-rose-800">{title}</p>
        {message ? <p className="mt-1 text-xs text-rose-700">{message}</p> : null}
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}

export function AgentEmptyState({ title, body, icon }: { title: string; body?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        {icon || <AlertTriangle aria-hidden="true" className="h-6 w-6" />}
      </div>
      <p className="mt-4 text-sm font-semibold text-stone-800">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500">{body}</p> : null}
    </div>
  );
}

export function AgentFreshnessBar({
  refreshedAt,
  onRefresh,
  refreshing,
  note,
}: {
  refreshedAt: string | null;
  onRefresh: () => void;
  refreshing?: boolean;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-stone-400">
        {refreshedAt
          ? `Updated ${new Date(refreshedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · engine truth`
          : "Waiting for first sync…"}
        {note ? <span className="ml-1">· {note}</span> : null}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 shadow-sm transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
      >
        <RefreshCw aria-hidden="true" className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- modal */

export function AgentModal({
  open,
  onClose,
  labelledBy,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------- operation glyphs (shared) */

export interface OperationVisual {
  /** Semantic icon for an engine operation row (receipt lists, dashboards). */
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  /** Tailwind classes for the glyph tile (bg/text/ring). */
  tileCls: string;
  /** Short human label for the operation kind. */
  label: string;
}

export function operationVisual(type: string, service?: string): OperationVisual {
  const svc = service || "";
  if (type === "CASH_IN" || svc === "ACCOUNT_DEPOSIT")
    return { icon: ArrowDownLeft, tileCls: "bg-emerald-50 text-emerald-600 ring-emerald-200", label: "Deposit" };
  if (type === "CASH_OUT" || svc === "ACCOUNT_WITHDRAWAL")
    return { icon: ArrowUpRight, tileCls: "bg-amber-50 text-amber-600 ring-amber-200", label: "Withdrawal" };
  if (type === "TRANSFER_NIP")
    return { icon: ArrowRightLeft, tileCls: "bg-sky-50 text-sky-600 ring-sky-200", label: "Transfer (NIP)" };
  if (type === "BILL_PAYMENT")
    return { icon: Receipt, tileCls: "bg-sky-50 text-sky-600 ring-sky-200", label: "Bill payment" };
  if (type === "FX_CONVERSION")
    return { icon: Landmark, tileCls: "bg-indigo-50 text-indigo-600 ring-indigo-200", label: "FX conversion" };
  if (type === "CARD_APPLICATION" || type === "CARD_APPLICATION_FEE")
    return { icon: CreditCard, tileCls: "bg-violet-50 text-violet-600 ring-violet-200", label: "Card application" };
  if (type === "ACCOUNT_OPENING")
    return { icon: Wallet, tileCls: "bg-teal-50 text-teal-600 ring-teal-200", label: "Account opening" };
  return { icon: Activity, tileCls: "bg-stone-100 text-stone-500 ring-stone-200", label: "Operation" };
}
