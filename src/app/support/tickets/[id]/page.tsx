"use client";

// =============================================================================
// File: src/app/support/tickets/[id]/page.tsx
// Description: Ticket detail — the working surface of the portal (§06/§19/§20).
//
// Conversation (customer/agent) + internal notes (separate, dashed, never in
// customer projections) + timeline. The action bar renders ONLY transitions
// the server said are legal for this officer (RBAC + lifecycle). SLA is
// computed server-side; this page displays it.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Flag,
  Lock,
  RotateCcw,
  Send,
  Star,
  UserPlus,
  Zap,
} from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import {
  ErrorState,
  LoadingPanel,
  Modal,
  OfflineBanner,
  PriorityBadge,
  SectionCard,
  SlaBadge,
  Spinner,
  StatusBadge,
  fmtDuration,
  relTime,
} from "@/components/support/SupportUI";
import {
  supportOps,
  isSupportApiError,
  supportErrorMessage,
  supportErrorCode,
  MacroDto,
  TicketDto,
} from "@/services/supportOpsClient";
import { SlaDto } from "@/services/supportOpsClient";

interface TicketDetail {
  ticket: TicketDto;
  sla: SlaDto;
  events: { id: string; timestamp: string; type: string; details: string; actorName: string }[];
  disputes: { id: string; disputeNumber: string; category: string; status: string; decisionOwner: string }[];
  escalations: { id: string; escalationNumber: string; destination: string; status: string; reason: string }[];
  csat?: { ticketId: string; rating: number; comment?: string; language: string; submittedAt: string };
  relatedTickets: TicketDto[];
  allowedTransitions: string[];
  capabilities: Record<string, boolean>;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, activeOfficer, isOnline, toast } = useSupportOps();

  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [macros, setMacros] = useState<MacroDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.ticket(id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setDetail(res);
    const m = await supportOps.macros();
    if (!isSupportApiError(m)) setMacros(m.items.filter((x) => x.enabled));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const doTransition = useCallback(
    async (status: string, extra?: { rootCause?: string; reason?: string }) => {
      if (!detail) return;
      setBusy(true);
      const res = await supportOps.updateTicket(
        id,
        { status, rootCause: extra?.rootCause, reason: extra?.reason },
      );
      setBusy(false);
      if (isSupportApiError(res)) {
        const code = supportErrorCode(res);
        toast(code === "FORBIDDEN" ? t("supportOps.errors.forbidden") : supportErrorMessage(res), "error");
        return;
      }
      toast(t("supportOps.toasts.statusChanged", { status: t(`supportOps.statuses.${status}`) }));
      void load();
    },
    [detail, id, t, toast, load],
  );

  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  if (loading && !detail) return <div className="mx-auto max-w-7xl"><LoadingPanel rows={9} /></div>;
  if (error) return <div className="mx-auto max-w-7xl"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!detail) return null;

  const { ticket, sla, capabilities } = detail;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="mb-2 flex items-center gap-1 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("supportOps.common.back")}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight">{ticket.ticketNumber}</h1>
              <StatusBadge status={ticket.status} t={t} />
              <PriorityBadge priority={ticket.priority} t={t} />
              <SlaBadge
                state={sla.state}
                t={t}
                extra={
                  sla.state === "BREACHED"
                    ? t("supportOps.sla.overdueBy", { time: fmtDuration(sla.remainingMs) })
                    : sla.state === "AT_RISK" || sla.state === "ON_TRACK"
                      ? t("supportOps.sla.remaining", { time: fmtDuration(sla.remainingMs) })
                      : undefined
                }
              />
            </div>
            <p className="mt-1 text-[15px] font-bold text-[var(--foreground)]">{ticket.subject}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {t("supportOps.ticket.created", { time: relTime(ticket.createdAt, t) })} · {t(`supportOps.jurisdictions.${ticket.jurisdiction}`)} · {t(`supportOps.channels.${ticket.channel}`)} · {t(`supportOps.priorities.${ticket.priority}`)}
            </p>
          </div>

          {/* Action bar — server-authorized transitions only */}
          <div className="flex flex-wrap items-center gap-2">
            {ticket.assignedOfficerId && capabilities.canAssign && (
              <ActionBtn icon={<UserPlus className="h-3.5 w-3.5" />} label={t("supportOps.ticket.assign")} onClick={() => setAssignOpen(true)} />
            )}
            {detail.allowedTransitions.includes("ESCALATED") && capabilities.canEscalate && (
              <ActionBtn icon={<Zap className="h-3.5 w-3.5" />} label={t("supportOps.ticket.escalate")} onClick={() => setEscalateOpen(true)} tone="warning" />
            )}
            {detail.allowedTransitions.includes("RESOLVED") && (
              <ActionBtn icon={<CheckCircle2 className="h-3.5 w-3.5" />} label={t("supportOps.ticket.resolve")} onClick={() => setResolveOpen(true)} tone="success" primary />
            )}
            {detail.allowedTransitions.includes("CLOSED") && (
              <ActionBtn icon={<Lock className="h-3.5 w-3.5" />} label={t("supportOps.ticket.close")} onClick={() => doTransition("CLOSED")} />
            )}
            {detail.allowedTransitions.includes("REOPENED") && (
              <ActionBtn icon={<RotateCcw className="h-3.5 w-3.5" />} label={t("supportOps.ticket.reopen")} onClick={() => doTransition("REOPENED")} />
            )}
          </div>
        </div>

        {ticket.isDuplicateOf && (
          <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-[var(--state-warning)]/40 bg-[var(--state-warning-soft)] px-3 py-2 text-xs font-bold text-[var(--state-warning)]">
            <Flag className="h-3.5 w-3.5" />
            {t("supportOps.ticket.duplicateOf", { ticket: ticket.isDuplicateOf })}
          </div>
        )}
        {sla.state === "PAUSED" && (
          <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-[var(--state-paused)]/40 bg-[var(--state-paused-soft)] px-3 py-2 text-xs font-bold text-[var(--state-paused)]">
            {t("supportOps.ticket.waitingHint")}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* ── Conversation + composer ──────────────────────────────── */}
        <div className="space-y-4 xl:col-span-2">
          <SectionCard title={t("supportOps.ticket.conversation")}>
            {ticket.messages && ticket.messages.length > 0 ? (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {ticket.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderType === "CUSTOMER" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.isInternalNote
                          ? "border border-dashed border-[var(--state-warning)]/50 bg-[var(--state-warning-soft)]"
                          : m.senderType === "CUSTOMER"
                            ? "rounded-tl-sm bg-[var(--surface-3)] text-[var(--foreground)]"
                            : "rounded-tr-sm bg-[var(--brand-soft-strong)] text-[var(--foreground)]"
                      }`}
                    >
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold text-[var(--muted)]">
                        {t(`supportOps.ticket.${m.senderType === "CUSTOMER" ? "customer" : m.isInternalNote ? "internal" : "agent"}`)}
                        {m.isInternalNote && <Lock className="h-3 w-3" />}
                        · {relTime(m.timestamp, t)}
                        {m.macroId && <span className="rounded bg-[var(--surface-3)] px-1">macro</span>}
                      </p>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[var(--muted)]">{t("supportOps.ticket.noConversation")}</p>
            )}
          </SectionCard>

          {/* Composer */}
          <Composer
            ticketId={ticket.id}
            macros={macros}
            canSend={capabilities.canReply}
            canNote={capabilities.canInternalNote}
            isOnline={isOnline}
            onDone={async () => {
              const res = await supportOps.ticket(id);
              if (!isSupportApiError(res)) setDetail(res);
            }}
            onRequestResolve={() => setResolveOpen(true)}
            onToast={(msg, type) => toast(msg, type ?? "success")}
          />

          {/* CSAT (after resolution) */}
          {ticket.satisfaction ? (
            <SectionCard title={t("supportOps.analytics.csat")}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-5 w-5 ${s <= (ticket.satisfaction ?? 0) ? "fill-[var(--brand-gold)] text-[var(--brand-gold)]" : "text-[var(--surface-3)]"}`} />
                  ))}
                </div>
                {detail.csat?.comment && <p className="text-xs italic text-[var(--foreground-muted)]">“{detail.csat.comment}”</p>}
              </div>
            </SectionCard>
          ) : null}
        </div>

        {/* ── Right rail ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Customer */}
          <SectionCard title={t("supportOps.ticket.customerPanel")}>
            <Link href={`/support/customers/${ticket.customerId}`} className="group block">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold group-hover:text-[var(--brand-primary)]">{ticket.customerName}</p>
                <span className="text-[11px] font-bold text-[var(--brand-primary)]">{t("supportOps.common.view")} →</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{ticket.customerId}</p>
              <dl className="mt-3 space-y-1.5 text-[11px]">
                <Row k={t("supportOps.ticket.category")} v={t(`supportOps.categories.${ticket.category}`)} />
                <Row k={t("supportOps.ticket.language")} v={ticket.language.toUpperCase()} />
                <Row k={t("supportOps.ticket.sentiment")} v={ticket.sentiment ? t(`supportOps.sentiment.${ticket.sentiment}`) : "—"} />
                <Row k={t("supportOps.ticket.assigned")} v={ticket.assignedOfficerName ?? t("supportOps.inbox.unassigned")} />
              </dl>
            </Link>
          </SectionCard>

          {/* Related transaction */}
          {ticket.relatedTransactionId && (
            <SectionCard title={t("supportOps.ticket.transactionPanel")}>
              <Link
                href={`/support/transactions/${ticket.relatedTransactionId}`}
                className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-xs font-extrabold text-[var(--brand-primary)] transition-colors hover:border-[var(--brand-border)]"
              >
                {ticket.relatedTransactionId}
                <span>→</span>
              </Link>
            </SectionCard>
          )}

          {/* Disputes */}
          {detail.disputes.length > 0 && (
            <SectionCard title={t("supportOps.ticket.relatedDispute")}>
              <div className="space-y-2">
                {detail.disputes.map((d) => (
                  <Link
                    key={d.id}
                    href={`/support/disputes/${d.id}`}
                    className="block rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <p className="text-xs font-extrabold text-[var(--foreground)]">{d.disputeNumber}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
                      {t(`supportOps.disputes.categoryLabels.${d.category}`) ?? d.category} · {t(`supportOps.disputes.statusLabels.${d.status}`) ?? d.status}
                    </p>
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Escalations */}
          {detail.escalations.length > 0 && (
            <SectionCard title={t("supportOps.nav.escalations")}>
              <div className="space-y-2">
                {detail.escalations.map((e) => (
                  <Link key={e.id} href={`/support/escalations/${e.id}`} className="block rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                    <p className="text-xs font-extrabold text-[var(--foreground)]">{e.escalationNumber}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
                      {t(`supportOps.escalations.destinationLabels.${e.destination}`)} · {t(`supportOps.escalations.statusLabels.${e.status}`)}
                    </p>
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Timeline */}
          <SectionCard title={t("supportOps.ticket.timeline")}>
            <ol className="relative space-y-3 border-l border-[var(--border)] pl-4">
              {detail.events.slice(0, 12).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--brand-accent)]" />
                  <p className="text-[11px] font-bold text-[var(--foreground)]">{e.details}</p>
                  <p className="text-[10px] text-[var(--muted)]">{e.actorName} · {relTime(e.timestamp, t)}</p>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* Related tickets */}
          {detail.relatedTickets.length > 0 && (
            <SectionCard title={t("supportOps.ticket.relatedTickets")}>
              <div className="space-y-1.5">
                {detail.relatedTickets.map((rt) => (
                  <Link key={rt.id} href={`/support/tickets/${rt.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold hover:bg-[var(--surface-2)]">
                    <span className="truncate text-[var(--foreground)]">{rt.ticketNumber} — {rt.subject}</span>
                    <StatusBadge status={rt.status} t={t} />
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <ResolveModal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        busy={busy}
        onSubmit={async (rootCause) => {
          await doTransition("RESOLVED", { rootCause });
          setResolveOpen(false);
        }}
      />
      <EscalateModal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        ticket={ticket}
        onDone={() => {
          setEscalateOpen(false);
          void load();
        }}
      />
      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        ticket={ticket}
        onDone={() => {
          setAssignOpen(false);
          void load();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="font-bold text-[var(--foreground)]">{v}</dd>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  tone,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "success" | "warning";
  primary?: boolean;
}) {
  const cls = primary
    ? "bg-[var(--state-success)] text-white hover:opacity-90"
    : tone === "warning"
      ? "border border-[var(--state-warning)]/50 text-[var(--state-warning)] hover:bg-[var(--state-warning-soft)]"
      : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-3)]";
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-[var(--support-radius-input)] px-3 py-2 text-xs font-extrabold transition-colors ${cls}`}>
      {icon} {label}
    </button>
  );
}

function ResolveModal({
  open,
  onClose,
  busy,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onSubmit: (rootCause: string) => Promise<void>;
}) {
  const { t } = useSupportOps();
  const [rootCause, setRootCause] = useState("");
  const [note, setNote] = useState("");
  const valid = rootCause.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={t("supportOps.ticket.resolve")}>
      <div className="space-y-3">
        <div>
          <label htmlFor="res-rc" className="mb-1 block text-xs font-bold">{t("supportOps.ticket.rootCause")} *</label>
          <input
            id="res-rc"
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>
        <div>
          <label htmlFor="res-note" className="mb-1 block text-xs font-bold">{t("supportOps.ticket.resolutionNote")}</label>
          <textarea
            id="res-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>
        <p className="text-[11px] text-[var(--muted)]">{t("supportOps.ticket.resolutionRequired")}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
            {t("supportOps.common.cancel")}
          </button>
          <button
            disabled={!valid || busy}
            onClick={() => {
              if (note.trim()) {
                // Resolution note rides along as the reason text on transition.
                void onSubmit(`${rootCause} — ${note}`);
              } else {
                void onSubmit(rootCause);
              }
            }}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--state-success)] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {busy && <Spinner />} {t("supportOps.ticket.resolve")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const ESCALATION_DESTINATIONS = ["FRAUD_RISK", "FINANCE", "COMPLIANCE", "BANKING_OPS", "ENGINEERING", "SETTLEMENT", "MANAGEMENT"] as const;

function EscalateModal({
  open,
  onClose,
  ticket,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  ticket: TicketDto;
  onDone: () => void;
}) {
  const { t, activeOfficer, toast } = useSupportOps();
  const [destination, setDestination] = useState<string>("FINANCE");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    const res = await supportOps.createEscalation(
      { ticketId: ticket.id, reason: reason.trim(), destination },
    );
    setBusy(false);
    if (isSupportApiError(res)) {
      const code = supportErrorCode(res);
      toast(
        code === "FORBIDDEN_DESTINATION" || code === "FORBIDDEN" ? t("supportOps.errors.forbidden") : supportErrorMessage(res),
        "error",
      );
      return;
    }
    toast(t("supportOps.toasts.escalated"));
    onDone();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("supportOps.ticket.escalate")}>
      <div className="space-y-3">
        <div>
          <label htmlFor="esc-dest" className="mb-1 block text-xs font-bold">{t("supportOps.escalations.destination")}</label>
          <select
            id="esc-dest"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          >
            {ESCALATION_DESTINATIONS.map((d) => (
              <option key={d} value={d}>{t(`supportOps.escalations.destinationLabels.${d}`)}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-[var(--muted)]">{t("supportOps.settings.permissionsHint")}</p>
        </div>
        <div>
          <label htmlFor="esc-reason" className="mb-1 block text-xs font-bold">{t("supportOps.escalations.reason")} *</label>
          <textarea
            id="esc-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
            {t("supportOps.common.cancel")}
          </button>
          <button
            disabled={!reason.trim() || busy}
            onClick={() => void submit()}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--state-warning)] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {busy && <Spinner />} {t("supportOps.escalations.new")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AssignModal({
  open,
  onClose,
  ticket,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  ticket: TicketDto;
  onDone: () => void;
}) {
  const { t, officers, activeOfficer, toast } = useSupportOps();
  const [officerId, setOfficerId] = useState(ticket.assignedOfficerId ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!officerId) return;
    setBusy(true);
    const res = await supportOps.updateTicket(ticket.id, { assignedOfficerId: officerId });
    setBusy(false);
    if (isSupportApiError(res)) {
      toast(supportErrorMessage(res), "error");
      return;
    }
    const officer = officers.find((o) => o.id === officerId);
    toast(t("supportOps.toasts.assigned", { name: officer?.fullName ?? officerId }));
    onDone();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("supportOps.ticket.assign")}>
      <div className="space-y-3">
        <div>
          <label htmlFor="asg-officer" className="mb-1 block text-xs font-bold">{t("supportOps.common.officer")}</label>
          <select
            id="asg-officer"
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]"
          >
            <option value="">{t("supportOps.common.none")}</option>
            {officers
              .filter((o) => o.status !== "OFFLINE")
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.fullName} — {t(`supportOps.roles.${o.role}`)}
                </option>
              ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
            {t("supportOps.common.cancel")}
          </button>
          <button
            disabled={!officerId || busy}
            onClick={() => void submit()}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-xs font-extrabold text-[var(--brand-on-primary)] disabled:opacity-50"
          >
            {busy && <Spinner />} {t("supportOps.ticket.assign")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- composer */

function Composer({
  ticketId,
  macros,
  canSend,
  canNote,
  isOnline,
  onDone,
  onRequestResolve,
  onToast,
}: {
  ticketId: string;
  macros: MacroDto[];
  canSend: boolean;
  canNote: boolean;
  isOnline: boolean;
  onDone: () => Promise<void>;
  onRequestResolve: () => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const { t, activeOfficer, lang } = useSupportOps();
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"message" | "note">("message");
  const [macroId, setMacroId] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedMacro = useMemo(() => macros.find((m) => m.id === macroId), [macros, macroId]);

  const send = async (withResolve: boolean) => {
    if (!content.trim() && !selectedMacro) return;
    setBusy(true);
    const res = await supportOps.postMessage(
      ticketId,
      {
        content: selectedMacro ? selectedMacro.body[lang] ?? selectedMacro.body.en : content.trim(),
        macroId: selectedMacro?.id,
        internal: mode === "note",
      },

      `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    );
    setBusy(false);
    if (isSupportApiError(res)) {
      onToast(supportErrorMessage(res), "error");
      return;
    }
    onToast(mode === "note" ? t("supportOps.toasts.noteAdded") : t("supportOps.toasts.messageSent"));
    setContent("");
    setMacroId("");
    await onDone();
    if (withResolve) {
      // Send & resolve: post the reply, then open the resolve modal so the
      // root cause stays an explicit, audited field.
      onRequestResolve();
    }
  };

  return (
    <div className="rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 backdrop-blur-[var(--glass-blur-01)]">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5" role="tablist">
          <button
            role="tab"
            aria-selected={mode === "message"}
            disabled={!canSend}
            onClick={() => { setMode("message"); setMacroId(""); }}
            className={`rounded-lg px-3 py-1 text-[11px] font-extrabold ${mode === "message" ? "bg-[var(--surface)] text-[var(--brand-primary)] shadow-sm" : "text-[var(--muted)]"} disabled:opacity-40`}
          >
            <Send className="mr-1 inline h-3 w-3" /> {t("supportOps.ticket.send")}
          </button>
          <button
            role="tab"
            aria-selected={mode === "note"}
            disabled={!canNote}
            onClick={() => { setMode("note"); setMacroId(""); }}
            className={`flex items-center rounded-lg px-3 py-1 text-[11px] font-extrabold ${mode === "note" ? "bg-[var(--surface)] text-[var(--state-warning)] shadow-sm" : "text-[var(--muted)]"} disabled:opacity-40`}
          >
            <Lock className="mr-1 inline h-3 w-3" /> {t("supportOps.ticket.internalNote").split("…")[0]}
          </button>
        </div>
        <select
          value={macroId}
          onChange={(e) => setMacroId(e.target.value)}
          aria-label={t("supportOps.ticket.macro")}
          disabled={mode === "note"}
          className="ml-auto max-w-[200px] rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-[11px] font-bold text-[var(--foreground)] outline-none focus:border-[var(--brand-border)] disabled:opacity-40"
        >
          <option value="">{t("supportOps.ticket.macro")}: {t("supportOps.common.none")}</option>
          {macros.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {selectedMacro && (
        <div className="mb-2 max-h-24 overflow-y-auto rounded-[10px] bg-[var(--surface-2)] px-3 py-2 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          {selectedMacro.body[lang] ?? selectedMacro.body.en}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={!!selectedMacro}
        placeholder={mode === "note" ? t("supportOps.ticket.internalNote") : t("supportOps.ticket.addMessage")}
        aria-label={mode === "note" ? t("supportOps.ticket.internalNote") : t("supportOps.ticket.addMessage")}
        className={`w-full resize-none rounded-[var(--support-radius-input)] border px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--muted)] disabled:opacity-50 ${
          mode === "note" ? "border-dashed border-[var(--state-warning)]/50 bg-[var(--state-warning-soft)]" : "border-[var(--border)] bg-[var(--input-bg)] focus:border-[var(--brand-border)]"
        }`}
      />

      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="mr-auto flex items-center gap-1 text-[10px] font-bold text-[var(--muted)]">
          <Bell className="h-3 w-3" /> {t("supportOps.ticket.sentiment")}
        </span>
        <button
          onClick={() => void send(true)}
          disabled={busy || !isOnline || (!content.trim() && !selectedMacro)}
          className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] border border-[var(--state-success)]/50 px-3 py-2 text-[11px] font-extrabold text-[var(--state-success)] hover:bg-[var(--state-success-soft)] disabled:opacity-40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> {t("supportOps.ticket.sendAndResolve")}
        </button>
        <button
          onClick={() => void send(false)}
          disabled={busy || !isOnline || (!content.trim() && !selectedMacro)}
          className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-[11px] font-extrabold text-[var(--brand-on-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-40"
        >
          {busy ? <Spinner /> : <Send className="h-3.5 w-3.5" />} {t("supportOps.ticket.send")}
        </button>
      </div>
    </div>
  );
}
