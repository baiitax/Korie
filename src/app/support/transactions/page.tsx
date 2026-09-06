"use client";

// =============================================================================
// File: src/app/support/transactions/page.tsx
// Description: Transactions — search by reference / ID / counterparty (§25).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, fmtMoney, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

export default function TransactionsPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<
    { transactionId: string; reference: string; amount: number; currency: string; status: string; timestamp: string; origin: string; destination: string }[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.searchTransactions(q);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isOnline) void load();
    }, q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [isOnline, load, q]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.transactions")}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.transactions.searchPlaceholder")}</p>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("supportOps.transactions.searchPlaceholder")}
          aria-label={t("supportOps.transactions.searchPlaceholder")}
          className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand-border)]"
        />
      </div>

      {loading && <LoadingPanel rows={6} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && (
        <EmptyState title={t("supportOps.transactions.noResults")} hint={t("supportOps.transactions.noResultsHint")} />
      )}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
          {rows.map((tx) => (
            <Link
              key={tx.transactionId}
              href={`/support/transactions/${tx.transactionId}`}
              className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-2)]"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-[var(--foreground)]">{tx.reference}</p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  {tx.origin} → {tx.destination} · {relTime(tx.timestamp, t)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-extrabold tabular-nums">{fmtMoney(tx.amount, tx.currency)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    tx.status === "SUCCESSFUL" || tx.status === "COMPLETED"
                      ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
                      : tx.status === "FAILED"
                        ? "bg-[var(--state-danger-soft)] text-[var(--state-danger)]"
                        : "bg-[var(--state-info-soft)] text-[var(--state-info)]"
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
