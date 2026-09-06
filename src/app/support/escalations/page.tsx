"use client";

// =============================================================================
// File: src/app/support/escalations/page.tsx
// Description: Escalations — ticket → specialist-team pipeline (§35–§36).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, EscalationDto } from "@/services/supportOpsClient";

export default function EscalationsPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [destination, setDestination] = useState("");
  const [rows, setRows] = useState<EscalationDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.escalations(destination ? { destination } : {}, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [destination, activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const tone = (s: string) =>
    s === "RESOLVED" ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
    : s === "ACTIONED" ? "bg-[var(--state-info-soft)] text-[var(--state-info)]"
    : s === "IN_REVIEW" ? "bg-[var(--state-warning-soft)] text-[var(--state-warning)]"
    : "bg-[var(--state-neutral-soft)] text-[var(--state-neutral)]";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.escalations")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.escalations.noneHint")}</p>
        </div>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          aria-label={t("supportOps.escalations.destination")}
          className="rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs font-semibold outline-none focus:border-[var(--brand-border)]"
        >
          <option value="">{t("supportOps.escalations.destination")}: {t("supportOps.common.all")}</option>
          {["FRAUD_RISK", "FINANCE", "COMPLIANCE", "BANKING", "ENGINEERING", "LEGAL", "MANAGEMENT"].map((d) => (
            <option key={d} value={d}>{t(`supportOps.escalations.destinationLabels.${d}`)}</option>
          ))}
        </select>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && <EmptyState title={t("supportOps.escalations.none")} hint={t("supportOps.escalations.noneHint")} />}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
          {rows.map((e) => (
            <Link key={e.id} href={`/support/escalations/${e.id}`} className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-2)]">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-extrabold text-[var(--foreground)]">{e.escalationNumber}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tone(e.status)}`}>
                    {t(`supportOps.escalations.statusLabels.${e.status}`)}
                  </span>
                  <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--foreground-muted)]">
                    {t(`supportOps.escalations.destinationLabels.${e.destination}`)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">{e.reason}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {t("supportOps.escalations.fromTicket", { ticket: e.ticketNumber ?? e.ticketId })}
                  {e.assignedToName ? ` · ${e.assignedToName}` : ""} · {relTime(e.createdAt, t)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
