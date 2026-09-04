"use client";

import React, { useEffect, useState, useRef } from "react";
import KpayBrandMark from "./KpayBrandMark";

/** Real, authoritative transaction status — never inferred, never faked. */
export type TransactionStatus =
  | "INITIATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESSFUL"
  | "FAILED"
  | "REVERSED";

export interface KpayTransactionSummaryItem {
  label: string;
  value: string;
}

export interface KpayTransactionOptions {
  title: string;
  amount?: string;
  recipient?: string;
  summary?: KpayTransactionSummaryItem[];
  status: TransactionStatus;
  providerWait?: boolean;
  /** Long-running (>8s) messaging. */
  longRunning?: boolean;
  onCheckStatus?: () => void;
}

const TERMINAL: TransactionStatus[] = ["SUCCESSFUL", "FAILED", "REVERSED"];

interface KpayTransactionLoaderProps {
  open: boolean;
  options?: KpayTransactionOptions;
  onClose?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * KoriePay Transaction Processing overlay.
 *
 * This is the MOST important specialised loader. It never claims success: it
 * renders only the status the backend actually reports. Terminal states
 * (SUCCESSFUL / FAILED / REVERSED) get a distinct visual; everything else
 * stays in an explicitly "still confirming" state with a clear guard against
 * duplicate submission. No fabricated percentages, no premature success.
 */
export const KpayTransactionLoader: React.FC<KpayTransactionLoaderProps> = ({
  open,
  options,
  onClose,
  t,
}) => {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const first = useRef(true);
  const [elapsed, setElapsed] = useState(0);

  // Only advance the "long running" threshold when NOT terminal and open.
  useEffect(() => {
    if (open) {
      first.current = false;
      setRender(true);
      const raf = requestAnimationFrame(() => setShown(true));
      setElapsed(0);
      const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => {
        cancelAnimationFrame(raf);
        clearInterval(iv);
      };
    }
    if (render && !first.current) {
      setShown(false);
      const fin = setTimeout(() => {
        setRender(false);
        onClose?.();
      }, 220);
      return () => clearTimeout(fin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!render || !options) return null;

  const { status } = options;
  const isTerminal = TERMINAL.includes(status);
  const isSuccess = status === "SUCCESSFUL";
  const isFailed = status === "FAILED" || status === "REVERSED";
  const longRunning = options.longRunning ?? elapsed >= 8;
  const providerWait = options.providerWait ?? (elapsed >= 3 && !isTerminal);

  const message =
    status === "SUCCESSFUL"
      ? t("loading.txSuccess")
      : status === "FAILED"
        ? t("loading.txFailed")
        : status === "REVERSED"
          ? t("loading.txReversed")
          : longRunning
            ? t("loading.txLongRunning")
            : providerWait
              ? t("loading.txConfirming")
              : t("loading.txProcessing");

  // Status pill color follows the real state.
  const pillCls = isSuccess
    ? "kp-badge-success"
    : isFailed
      ? "kp-badge-danger"
      : "kp-badge-brand";

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center p-4 transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-busy={!isTerminal}
      aria-live="polite"
      aria-label={options.title}
    >
      {/* Dimmed overlay keeps glass readable */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div className="absolute inset-0 kp-loader-surface" aria-hidden style={{ opacity: 0.4 }} />

      <div
        className={`relative w-full max-w-md rounded-3xl p-7 sm:p-8 kp-loader-stage flex flex-col items-center text-center gap-5 ${
          shown ? "kp-anim-reveal" : ""
        }`}
      >
        {/* Brand mark */}
        <KpayBrandMark size={isTerminal ? "sm" : "lg"} breathe={!isTerminal} glow />

        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[var(--foreground)]">{options.title}</h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${pillCls}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSuccess ? "bg-[var(--success)]" : isFailed ? "bg-[var(--danger)]" : "bg-[var(--brand-primary)] animate-pulse"
              }`}
              aria-hidden
            />
            {status}
          </span>
        </div>

        {/* Amount */}
        {options.amount && (
          <div className="text-3xl font-extrabold tabular text-[var(--foreground)]">
            {options.amount}
          </div>
        )}

        {/* Summary (real data only) */}
        {options.summary && options.summary.length > 0 && (
          <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 divide-y divide-[var(--border)] text-xs">
            {options.summary.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-[var(--muted)]">{row.label}</span>
                <span className="font-semibold tabular text-[var(--foreground)]">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation copy */}
        <div className="space-y-2">
          <p className="text-sm text-[var(--foreground)]">{message}</p>
          {!isTerminal && (
            <p className="text-xs text-[var(--muted)] flex items-center justify-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              {t("loading.doNotResubmit")}
            </p>
          )}
        </div>

        {/* Check status only when the result is genuinely uncertain (not terminal). */}
        {!isTerminal && options.onCheckStatus && (
          <button
            type="button"
            onClick={options.onCheckStatus}
            className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
          >
            {t("loading.checkStatus")}
          </button>
        )}

        {/* Close path when terminal */}
        {isTerminal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] ${
              isSuccess ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]" : "bg-[var(--foreground)]/80 hover:bg-[var(--foreground)]"
            }`}
          >
            {isSuccess ? t("common.continue") : t("common.close")}
          </button>
        )}
      </div>
    </div>
  );
};

export default KpayTransactionLoader;
