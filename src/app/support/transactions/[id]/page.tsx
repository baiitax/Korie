"use client";

// =============================================================================
// File: src/app/support/transactions/[id]/page.tsx
// Description: Transaction investigation detail (§24–§27).
// Authoritative status (engine row wins), human status explanation, timeline,
// provider trace (references only — never keys or headers), ledger state,
// related tickets & disputes.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Banknote, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import {
  ErrorState,
  LoadingPanel,
  OfflineBanner,
  SectionCard,
  StatusBadge,
  ToneBadge,
  fmtMoney,
  relTime,
} from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, TransactionInvestigationDto } from "@/services/supportOpsClient";

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [view, setView] = useState<TransactionInvestigationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.transaction(id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setView(res);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  if (loading && !view) return <div className="mx-auto max-w-5xl"><LoadingPanel rows={8} /></div>;
  if (error && !view) return <div className="mx-auto max-w-5xl"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!view) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div>
        <button onClick={() => history.back()} className="mb-2 flex items-center gap-1 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("supportOps.common.back")}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{view.reference}</h1>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {view.transactionId} · {view.channel} · {relTime(view.timestamp, t)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ToneBadge tone={view.status === "SUCCESSFUL" || view.status === "COMPLETED" || view.status === "POSTED" ? "success" : view.status === "FAILED" ? "danger" : "info"}>
              {view.status}
            </ToneBadge>
            <ToneBadge tone="neutral">{view.source}</ToneBadge>
          </div>
        </div>
        <p className="mt-2 rounded-[10px] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--foreground-muted)]">
          {t(`supportOps.transactions.statusExplanation.${view.statusExplanationKey}`)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Facts */}
        <SectionCard title={t("supportOps.transactions.investigation")} className="lg:col-span-1">
          <dl className="space-y-2.5 text-xs">
            <F k={t("supportOps.transactions.amount")} v={fmtMoney(view.amount, view.currency)} big />
            {view.fee != null && <F k={t("supportOps.transactions.fee")} v={fmtMoney(view.fee, view.currency)} />}
            <F k={t("supportOps.transactions.origin")} v={view.originEntity} />
            <F k={t("supportOps.transactions.destination")} v={view.destinationEntity} />
            <F
              k={t("supportOps.transactions.ledgerStatus")}
              v={
                <span className="flex items-center gap-1.5 font-extrabold text-[var(--state-success)]">
                  <Banknote className="h-3.5 w-3.5" /> {view.ledgerStatus}
                </span>
              }
            />
            {view.failureReason && <F k={t("supportOps.transactions.failureReason")} v={<span className="font-bold text-[var(--state-danger)]">{view.failureReason}</span>} />}
          </dl>
        </SectionCard>

        {/* Provider + timeline */}
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title={t("supportOps.transactions.provider")}>
            {view.provider ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <Pv k={t("supportOps.transactions.providerNode")} v={view.provider.node} />
                <Pv k={t("supportOps.transactions.providerReference")} v={view.provider.reference} />
                <Pv k={t("supportOps.transactions.webhookStatus")} v={view.provider.status} />
              </div>
            ) : (
              <p className="py-3 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
            )}
            {view.liveRow && (
              <div className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
                {view.liveRow.providerCode && (
                  <p>
                    {view.liveRow.providerCode} → {view.liveRow.providerResponseCode ?? "—"} · {view.liveRow.providerReference ?? "—"}
                  </p>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title={t("supportOps.transactions.timeline")}>
            {view.timeline.length === 0 ? (
              <p className="py-3 text-center text-xs text-[var(--muted)]">{t("supportOps.transactions.noTimeline")}</p>
            ) : (
              <ol className="space-y-0">
                {view.timeline.map((step, i) => (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < view.timeline.length - 1 && <span className="absolute left-[9px] top-5 h-full w-px bg-[var(--border)]" />}
                    <span
                      className={`relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        step.status === "FAIL"
                          ? "bg-[var(--state-danger)]"
                          : step.status === "WARN"
                            ? "bg-[var(--state-warning)]"
                            : "bg-[var(--state-success)]"
                      } text-white`}
                    >
                      {step.status === "FAIL" ? <XCircle className="h-3.5 w-3.5" /> : step.status === "WARN" ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[var(--foreground)]">
                        {step.stage} <span className="ml-1 font-semibold text-[var(--muted)]">{step.status}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">{step.details}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--muted)]">{step.timestamp}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard title={t("supportOps.transactions.relatedTickets")}>
              {view.relatedTickets.length === 0 ? (
                <p className="py-3 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
              ) : (
                <div className="space-y-1.5">
                  {view.relatedTickets.map((tk) => (
                    <Link key={tk.id} href={`/support/tickets/${tk.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]">
                      <span className="truncate font-bold text-[var(--foreground)]">{tk.ticketNumber}</span>
                      <StatusBadge status={tk.status} t={t} />
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title={t("supportOps.transactions.relatedDisputes")}>
              {view.relatedDisputes.length === 0 ? (
                <p className="py-3 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
              ) : (
                <div className="space-y-1.5">
                  {view.relatedDisputes.map((d) => (
                    <Link key={d.id} href={`/support/disputes/${d.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]">
                      <span className="truncate font-bold text-[var(--foreground)]">{d.disputeNumber}</span>
                      <span className="text-[10px] font-bold text-[var(--muted)]">{t(`supportOps.disputes.statusLabels.${d.status}`) ?? d.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ k, v, big }: { k: string; v: React.ReactNode; big?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{k}</dt>
      <dd className={`mt-0.5 ${big ? "text-lg font-extrabold tabular-nums" : "text-xs font-bold"} text-[var(--foreground)]`}>{v}</dd>
    </div>
  );
}

function Pv({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[10px] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{k}</p>
      <p className="mt-0.5 truncate text-xs font-extrabold text-[var(--foreground)]" title={v}>{v}</p>
    </div>
  );
}
