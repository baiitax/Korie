"use client";

// =============================================================================
// File: src/app/support/disputes/[id]/page.tsx
// Description: Dispute detail + decision (§29/§30).
//
// Money decisions are the strictest action in the portal:
//   • only roles with decide_dispute may open the decision panel,
//   • the server re-checks decisionOwner match (FORBIDDEN_DECISION_OWNER),
//   • refund/reversal approvals are written to the authoritative recovery
//     engine — Support never touches balances (§31).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Gavel, ShieldAlert } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import {
  ErrorState,
  LoadingPanel,
  Modal,
  OfflineBanner,
  PriorityBadge,
  SectionCard,
  Spinner,
  relTime,
} from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, supportErrorCode, supportErrorMessage, DisputeDto, TicketDto } from "@/services/supportOpsClient";

interface DisputeDetail {
  dispute: DisputeDto;
  ticket?: TicketDto;
}

const DECISIONS = [
  "UNDER_INVESTIGATION",
  "AWAITS_CUSTOMER",
  "REJECTED",
  "CUSTOMER_FAVOUR",
  "MERCHANT_FAVOUR",
  "REFUND_APPROVED",
  "REVERSAL_APPROVED",
  "PARTIAL_REFUND",
  "NO_ACTION",
] as const;

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, activeOfficer, isOnline, toast } = useSupportOps();
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);

  const canDecide = activeOfficer?.capabilities?.includes("decide_dispute") ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.dispute(id, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setDetail(res);
    setLoading(false);
  }, [id, activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  if (loading && !detail) return <div className="mx-auto max-w-5xl"><LoadingPanel rows={7} /></div>;
  if (error && !detail) return <div className="mx-auto max-w-5xl"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!detail) return null;

  const d = detail.dispute;
  const statusTone =
    d.status === "RESOLVED" || d.status === "CLOSED" || d.status === "DECIDED"
      ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
      : d.status === "AWAITS_DECISION"
        ? "bg-[var(--state-warning-soft)] text-[var(--state-warning)]"
        : "bg-[var(--state-info-soft)] text-[var(--state-info)]";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div>
        <button onClick={() => history.back()} className="mb-2 flex items-center gap-1 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("supportOps.common.back")}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{d.disputeNumber}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${statusTone}`}>{t(`supportOps.disputes.statusLabels.${d.status}`) ?? d.status}</span>
              <PriorityBadge priority={d.priority} t={t} />
            </div>
            <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
              {t(`supportOps.disputes.categoryLabels.${d.category}`) ?? d.category} · {d.transactionReference}
            </p>
          </div>
          {canDecide && (
            <button
              onClick={() => setDecisionOpen(true)}
              className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-xs font-extrabold text-[var(--brand-on-primary)] shadow-sm hover:bg-[var(--brand-primary-hover)]"
            >
              <Gavel className="h-4 w-4" /> {t("supportOps.disputes.addDecision")}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title={t("supportOps.disputes.claim")}>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--foreground)]">{d.claim}</p>
            <div className="mt-3 flex items-center gap-6 border-t border-[var(--border)] pt-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{t("supportOps.disputes.claimAmount")}</p>
                <p className="text-lg font-extrabold tabular-nums">
                  {d.claimAmount.toLocaleString()} {d.currency === "XOF" ? "CFA" : d.currency === "NGN" ? "₦" : d.currency}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{t("supportOps.disputes.decisionOwner")}</p>
                <p className="text-[13px] font-extrabold">{t(`supportOps.roles.${d.decisionOwner}`)}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{t("supportOps.disputes.requestedBy")}</p>
                <p className="text-[13px] font-extrabold">{d.requestedBy}</p>
              </div>
            </div>
          </SectionCard>

          {d.decision && (
            <SectionCard title={t("supportOps.disputes.decision")}>
              <div className="rounded-[10px] bg-[var(--surface-2)] px-4 py-3">
                <p className="text-sm font-extrabold text-[var(--foreground)]">
                  {t(`supportOps.disputes.decisionLabels.${d.decision.type}`) ?? d.decision.type}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">{d.decision.reason}</p>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  {d.decision.decidedByName} · {relTime(d.decision.decidedAt, t)}
                </p>
              </div>
              {d.decision.recoveryCaseReference && (
                <Link
                  href="/support/refunds"
                  className="mt-3 flex items-center justify-between rounded-[10px] border border-[var(--state-success)]/40 bg-[var(--state-success-soft)] px-3 py-2.5 text-xs font-extrabold text-[var(--state-success)]"
                >
                  {t("supportOps.disputes.recoveryCase")}: {d.decision.recoveryCaseReference}
                  <span>→</span>
                </Link>
              )}
            </SectionCard>
          )}
        </div>

        <div className="space-y-4">
          {detail.ticket && (
            <SectionCard title={t("supportOps.inbox.ticket")}>
              <Link href={`/support/tickets/${detail.ticket.id}`} className="block">
                <p className="text-[13px] font-extrabold text-[var(--foreground)]">{detail.ticket.ticketNumber}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--foreground-muted)]">{detail.ticket.subject}</p>
              </Link>
            </SectionCard>
          )}
          <SectionCard title={t("supportOps.customers.customer")}>
            <Link href={`/support/customers/${d.customerId}`} className="block">
              <p className="text-[13px] font-extrabold text-[var(--foreground)]">{d.customerName}</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{d.customerId}</p>
            </Link>
          </SectionCard>
          <SectionCard title={t("supportOps.transactions.reference")}>
            <Link
              href={`/support/transactions/${d.transactionReference}`}
              className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-xs font-extrabold text-[var(--brand-primary)] hover:border-[var(--brand-border)]"
            >
              {d.transactionReference} <span>→</span>
            </Link>
          </SectionCard>
          <div className="flex items-start gap-2 rounded-[10px] border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--brand-primary)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {t("supportOps.disputes.decisionNote")}
          </div>
        </div>
      </div>

      <DecisionModal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        dispute={d}
        onDecided={async () => {
          setDecisionOpen(false);
          const res = await supportOps.dispute(id, activeOfficer?.id);
          if (!isSupportApiError(res)) setDetail(res);
        }}
      />
    </div>
  );
}

function DecisionModal({
  open,
  onClose,
  dispute,
  onDecided,
}: {
  open: boolean;
  onClose: () => void;
  dispute: DisputeDto;
  onDecided: () => Promise<void>;
}) {
  const { t, activeOfficer, toast } = useSupportOps();
  const [type, setType] = useState<string>("UNDER_INVESTIGATION");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    const res = await supportOps.decideDispute(dispute.id, { type, reason: reason.trim() }, activeOfficer?.id);
    setBusy(false);
    if (isSupportApiError(res)) {
      const code = supportErrorCode(res);
      toast(
        code === "FORBIDDEN_DECISION_OWNER"
          ? t("supportOps.errors.forbiddenDecision")
          : code === "FORBIDDEN"
            ? t("supportOps.errors.forbidden")
            : supportErrorMessage(res),
        "error",
      );
      return;
    }
    toast(t("supportOps.toasts.disputeDecided"));
    await onDecided();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("supportOps.disputes.addDecision")}>
      <div className="space-y-3">
        <div>
          <label htmlFor="dec-type" className="mb-1 block text-xs font-bold">{t("supportOps.disputes.decision")}</label>
          <select
            id="dec-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          >
            {DECISIONS.map((dt) => (
              <option key={dt} value={dt}>{t(`supportOps.disputes.decisionLabels.${dt}`) ?? dt}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dec-reason" className="mb-1 block text-xs font-bold">{t("supportOps.disputes.reason")} *</label>
          <textarea
            id="dec-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">{t("supportOps.disputes.decisionNote")}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
            {t("supportOps.common.cancel")}
          </button>
          <button
            disabled={!reason.trim() || busy}
            onClick={() => void submit()}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-xs font-extrabold text-[var(--brand-on-primary)] disabled:opacity-50"
          >
            {busy && <Spinner />} {t("supportOps.disputes.addDecision")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
