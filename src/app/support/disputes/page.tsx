"use client";

// =============================================================================
// File: src/app/support/disputes/page.tsx
// Description: Disputes — the money-conflict workflow (§29/§30).
// Full lifecycle display, decision-owner visibility, and (for authorized
// roles) the decision action lives on the detail page.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, PriorityBadge, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, DisputeDto } from "@/services/supportOpsClient";

export default function DisputesPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<DisputeDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.disputes(status ? { status } : {});
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const statusTone = (s: string) =>
    s === "RESOLVED" || s === "CLOSED" || s === "DECIDED"
      ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
      : s === "AWAITS_DECISION"
        ? "bg-[var(--state-warning-soft)] text-[var(--state-warning)]"
        : "bg-[var(--state-info-soft)] text-[var(--state-info)]";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.disputes")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.disputes.noneHint")}</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={t("supportOps.common.status")}
          className="rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs font-semibold outline-none focus:border-[var(--brand-border)]"
        >
          <option value="">{t("supportOps.common.status")}: {t("supportOps.common.all")}</option>
          {["OPEN", "UNDER_REVIEW", "EVIDENCE_REQUESTED", "AWAITS_DECISION", "DECIDED", "RESOLVED", "CLOSED"].map((s) => (
            <option key={s} value={s}>{t(`supportOps.disputes.statusLabels.${s}`)}</option>
          ))}
        </select>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && <EmptyState title={t("supportOps.disputes.none")} hint={t("supportOps.disputes.noneHint")} />}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
          {rows.map((d) => (
            <Link
              key={d.id}
              href={`/support/disputes/${d.id}`}
              className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-2)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-extrabold text-[var(--foreground)]">{d.disputeNumber}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusTone(d.status)}`}>
                    {t(`supportOps.disputes.statusLabels.${d.status}`) ?? d.status}
                  </span>
                  <PriorityBadge priority={d.priority} t={t} />
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">
                  {t(`supportOps.disputes.categoryLabels.${d.category}`) ?? d.category} · {d.customerName} · {d.transactionReference}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {t("supportOps.disputes.decisionOwner")}: {t(`supportOps.roles.${d.decisionOwner}`)} · {t("supportOps.disputes.requestedBy")}: {d.requestedBy} · {relTime(d.createdAt, t)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-extrabold tabular-nums text-[var(--foreground)]">
                {d.claimAmount.toLocaleString()} {d.currency === "XOF" ? "CFA" : d.currency === "NGN" ? "₦" : d.currency}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
