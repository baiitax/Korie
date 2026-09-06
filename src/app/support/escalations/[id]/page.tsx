"use client";

// =============================================================================
// File: src/app/support/escalations/[id]/page.tsx
// Description: Escalation detail (§36) — status, resolution, ticket link.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, LoadingPanel, Modal, OfflineBanner, SectionCard, Spinner, StatusBadge, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, supportErrorMessage, EscalationDto, TicketDto } from "@/services/supportOpsClient";

interface EscalationDetail {
  escalation: EscalationDto;
  ticket?: TicketDto;
}

const STATUSES = ["PENDING", "IN_REVIEW", "ACTIONED", "RESOLVED"] as const;

export default function EscalationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, activeOfficer, isOnline, toast } = useSupportOps();
  const [detail, setDetail] = useState<EscalationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.escalation(id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setDetail(res);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  if (loading && !detail) return <div className="mx-auto max-w-4xl"><LoadingPanel rows={6} /></div>;
  if (error && !detail) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!detail) return null;

  const e = detail.escalation;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div>
        <button onClick={() => history.back()} className="mb-2 flex items-center gap-1 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("supportOps.common.back")}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{e.escalationNumber}</h1>
            <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">
              {t("supportOps.escalations.fromTicket", { ticket: e.ticketNumber ?? e.ticketId })} · {t(`supportOps.escalations.destinationLabels.${e.destination}`)}
              {e.assignedToName ? ` · ${e.assignedToName}` : ""}
            </p>
          </div>
          {e.status !== "RESOLVED" && (
            <button
              onClick={() => setResolveOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] bg-[var(--state-success)] px-3 py-2 text-xs font-extrabold text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("supportOps.escalations.markResolved")}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title={t("supportOps.escalations.reason")}>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--foreground)]">{e.reason}</p>
          <p className="mt-3 text-[11px] text-[var(--muted)]">{relTime(e.createdAt, t)}</p>
        </SectionCard>
        <SectionCard title={t("supportOps.escalations.resolution")}>
          {e.resolutionNote ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--foreground)]">{e.resolutionNote}</p>
          ) : (
            <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
            {STATUSES.map((s) => (
              <span
                key={s}
                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                  s === e.status
                    ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]"
                    : "bg-[var(--surface-3)] text-[var(--muted)]"
                }`}
              >
                {t(`supportOps.escalations.statusLabels.${s}`)}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>

      {detail.ticket && (
        <SectionCard title={t("supportOps.inbox.ticket")}>
          <Link href={`/support/tickets/${detail.ticket.id}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-[var(--foreground)]">{detail.ticket.ticketNumber}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">{detail.ticket.subject}</p>
            </div>
            <StatusBadge status={detail.ticket.status} t={t} />
          </Link>
        </SectionCard>
      )}

      <ResolveModal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onDone={async (note) => {
          const res = await supportOps.updateEscalation(id, { status: "RESOLVED", resolutionNote: note });
          setResolveOpen(false);
          if (isSupportApiError(res)) {
            toast(supportErrorMessage(res), "error");
            return;
          }
          toast(t("supportOps.toasts.taskDone"));
          const refreshed = await supportOps.escalation(id);
          if (!isSupportApiError(refreshed)) setDetail(refreshed);
        }}
      />
    </div>
  );
}

function ResolveModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (note: string) => Promise<void>;
}) {
  const { t } = useSupportOps();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={t("supportOps.escalations.markResolved")}>
      <div className="space-y-3">
        <div>
          <label htmlFor="esc-res-note" className="mb-1 block text-xs font-bold">{t("supportOps.escalations.resolution")}</label>
          <textarea
            id="esc-res-note"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            rows={3}
            className="w-full resize-none rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
            {t("supportOps.common.cancel")}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onDone(note.trim()).finally(() => setBusy(false));
            }}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--state-success)] px-4 py-2 text-xs font-extrabold text-white"
          >
            {busy && <Spinner />} {t("supportOps.escalations.markResolved")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
