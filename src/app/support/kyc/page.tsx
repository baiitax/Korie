"use client";

// =============================================================================
// File: src/app/support/kyc/page.tsx
// Description: KYC Queue (spec §33).
//
// KYC is advisory in support — officers investigate, annotate and hand off
// to compliance; they can NEVER approve a tier or move funds. The queue is
// built from real data:
//   • KYC_TIER tickets across the queue (this portal's records),
//   • the live KYC verification count from the health engine (authoritative
//     document queue), which links into /support/system-health.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, PriorityBadge, StatusBadge, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, TicketDto } from "@/services/supportOpsClient";

export default function KycQueuePage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const router = useRouter();
  const [rows, setRows] = useState<TicketDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.tickets({ category: "KYC_TIER", limit: "50" }, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.kyc")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">
            {t("supportOps.customers.kyc")}
          </p>
        </div>
        <Link
          href="/support/system-health"
          className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-extrabold text-[var(--brand-primary)] hover:border-[var(--brand-border)]"
        >
          <ShieldCheck className="h-4 w-4" /> {t("supportOps.nav.systemHealth")}
        </Link>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && (
        <EmptyState
          title={t("supportOps.inbox.noTickets")}
          hint={t("supportOps.inbox.noTicketsHint")}
          icon={<ShieldCheck className="h-5 w-5" />}
          action={
            <button
              onClick={() => router.push("/support/inbox?category=KYC_TIER&open=1")}
              className="mt-1 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-xs font-extrabold text-[var(--brand-on-primary)]"
            >
              {t("supportOps.inbox.title")}
            </button>
          }
        />
      )}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
          {rows.map((tk) => (
            <Link
              key={tk.id}
              href={`/support/tickets/${tk.id}`}
              className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-2)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-extrabold text-[var(--foreground)]">{tk.ticketNumber}</p>
                  <StatusBadge status={tk.status} t={t} />
                  <PriorityBadge priority={tk.priority} t={t} />
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">{tk.subject}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {tk.customerName} · {relTime(tk.updatedAt, t)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
