"use client";

// =============================================================================
// File: src/app/support/refunds/page.tsx
// Description: Refunds & Reversals (spec §31).
//
// Two views of the same real data, clearly labelled:
//   1. Support disputes carrying financial decisions (support_disputes rows).
//   2. Recovery cases — those same decided disputes annotated with what the
//      real ledger_transactions posting (public.post_dispute_resolution)
//      actually recorded. Support decides; the database posts and is the
//      sole authority over balances.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, BadgeDollarSign, ShieldCheck } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

type CheckerQueueDto = Exclude<Awaited<ReturnType<typeof supportOps.disputeApprovals>>, { __supportError: true }>;

interface RefundsData {
  items: {
    disputeNumber: string; id: string; category: string; status: string; customerName: string;
    transactionReference: string; amount: number; currency: string;
    decision?: { type: string; reason: string }; recoveryCaseReference?: string; createdAt: string;
  }[];
  recoveryCases: {
    id: string; reference: string; transactionReference: string; claimantName: string; category: string;
    amount: number; currency: string; priority: string; status: string; heldReserve: number;
    outcome?: string; createdAt: string;
  }[];
}

export default function RefundsPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [tab, setTab] = useState<"refunds" | "reversals" | "checker">("refunds");

  // /support/reversals redirects here with ?tab=reversals (§107).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "reversals") setTab("reversals");
  }, []);
  const [data, setData] = useState<RefundsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checker, setChecker] = useState<CheckerQueueDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.refunds();
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setData(res);
    setLoading(false);
    const cq = await supportOps.disputeApprovals().catch(() => null);
    if (cq && !isSupportApiError(cq)) setChecker(cq);
  }, []);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const money = (amount: number, currency: string) =>
    `${amount.toLocaleString()} ${currency === "XOF" ? "CFA" : currency === "NGN" ? "₦" : currency}`;

  const recoveryTone = (s: string) =>
    s === "RESOLVED" ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
    : s === "REJECTED" || s === "CLOSED" ? "bg-[var(--state-neutral-soft)] text-[var(--state-neutral)]"
    : "bg-[var(--state-info-soft)] text-[var(--state-info)]";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.refunds.title")}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.refunds.supportOnly")}</p>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="flex items-center gap-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-fit" role="tablist">
        {(["refunds", "reversals", "checker"] as const).map((tb) => (
          <button
            key={tb}
            role="tab"
            aria-selected={tab === tb}
            onClick={() => setTab(tb)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${
              tab === tb ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]" : "text-[var(--muted)]"
            }`}
          >
            {tb === "refunds" ? <BadgeDollarSign className="h-3.5 w-3.5" /> : tb === "reversals" ? <ArrowLeftRight className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {tb === "refunds" ? t("supportOps.refunds.tabRefunds") : tb === "reversals" ? t("supportOps.refunds.tabReversals") : t("supportOps.refunds.tabChecker")}
            {tb === "checker" && checker?.pending_count ? (
              <span className="rounded-full bg-[var(--state-warning-soft)] px-1.5 text-[10px] font-extrabold text-[var(--state-warning)]">{checker.pending_count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!loading && !error && data && tab === "refunds" && (
        data.items.length === 0 ? (
          <EmptyState title={t("supportOps.refunds.none")} hint={t("supportOps.refunds.noneHint")} />
        ) : (
          <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
            {data.items.map((r) => (
              <Link key={r.id} href={`/support/disputes/${r.id}`} className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-2)]">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-extrabold text-[var(--foreground)]">{r.disputeNumber}</p>
                    {r.decision && (
                      <span className="rounded-full bg-[var(--brand-soft-strong)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--brand-primary)]">
                        {t(`supportOps.disputes.decisionLabels.${r.decision.type}`) ?? r.decision.type}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">
                    {r.customerName} · {r.transactionReference} · {relTime(r.createdAt, t)}
                  </p>
                  {r.recoveryCaseReference && (
                    <p className="mt-0.5 text-[10px] font-bold text-[var(--state-success)]">
                      {t("supportOps.disputes.recoveryCase")}: {r.recoveryCaseReference}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-extrabold tabular-nums">{money(r.amount, r.currency)}</p>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === "checker" && <CheckerQueue onChanged={() => void load()} />}

      {!loading && !error && data && tab === "reversals" && (
        <>
          <p className="text-[11px] font-bold text-[var(--muted)]">{t("supportOps.refunds.recoverySource")}</p>
          {data.recoveryCases.length === 0 ? (
            <EmptyState title={t("supportOps.refunds.none")} hint={t("supportOps.refunds.noneHint")} />
          ) : (
            <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
              {data.recoveryCases.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-extrabold text-[var(--foreground)]">{c.reference}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${recoveryTone(c.status)}`}>{c.status}</span>
                      {c.outcome && (
                        <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--foreground-muted)]">
                          {t(`supportOps.disputes.decisionLabels.${c.outcome}`) ?? c.outcome}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">
                      {c.claimantName} · {c.transactionReference} · {relTime(c.createdAt, t)}
                    </p>
                    {c.heldReserve > 0 && (
                      <p className="mt-0.5 text-[10px] font-bold text-[var(--state-warning)]">
                        {t("supportOps.refunds.heldReserve")}: {money(c.heldReserve, c.currency)}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-extrabold tabular-nums">{money(c.amount, c.currency)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Checker queue (PS-2): pending financial dispute decisions awaiting a
 *  DIFFERENT officer. Approve executes the posting inside the approval
 *  transaction; the database refuses self-approval. */
function CheckerQueue({ onChanged }: { onChanged: () => void }) {
  const { t } = useSupportOps();
  const [queue, setQueue] = useState<CheckerQueueDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.disputeApprovals();
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setQueue(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: "APPROVE" | "REJECT") => {
    setBusyId(id);
    setError(null);
    setFlash(null);
    const res = await supportOps.decideDisputeApproval(id, decision, notes[id] ?? "");
    setBusyId(null);
    if (isSupportApiError(res)) {
      setError(res.message);
      return;
    }
    setFlash(res.status === "EXECUTED" ? t("supportOps.refunds.checkerExecuted") : t("supportOps.refunds.checkerRejected"));
    await load();
    onChanged();
  };

  const money = (amount: number | string | undefined, currency: string | undefined) =>
    `${Number(amount ?? 0).toLocaleString()} ${currency === "XOF" ? "CFA" : currency === "NGN" ? "₦" : currency ?? ""}`;

  const pending = queue?.requests.filter((r) => r.status === "PENDING") ?? [];
  const recent = queue?.requests.filter((r) => r.status !== "PENDING").slice(0, 10) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-bold text-[var(--muted)]">
        {t("supportOps.refunds.checkerNoneHint")}
      </p>
      {flash && <div className="rounded-[var(--support-radius-input)] border border-[var(--state-success)] bg-[var(--state-success-soft)] px-3 py-2 text-xs font-bold text-[var(--state-success)]">{flash}</div>}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && <LoadingPanel rows={3} />}

      {!loading && pending.length === 0 && (
        <EmptyState title={t("supportOps.refunds.checkerNone")} hint={t("supportOps.refunds.checkerNoneHint")} />
      )}

      {!loading && pending.map((r) => {
        const p = (r.payload ?? {}) as Record<string, unknown>;
        const amount = p.decision_type === "PARTIAL_REFUND" ? p.partial_amount : r.dispute?.claim_amount;
        const isSelf = queue?.can_check_as && r.maker_email && r.maker_email.toLowerCase() === queue.can_check_as.toLowerCase();
        return (
          <div key={r.id} className="rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-extrabold">{r.dispute?.dispute_number ?? String(p.dispute_number ?? "")}</p>
              <span className="rounded-full bg-[var(--brand-soft-strong)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--brand-primary)]">
                {t(`supportOps.disputes.decisionLabels.${String(p.decision_type ?? "")}`) ?? String(p.decision_type ?? "")}
              </span>
              <span className="text-sm font-extrabold tabular-nums">{money(amount as number, (p.currency as string) ?? r.dispute?.currency)}</span>
              <span className="ml-auto text-[11px] text-[var(--foreground-muted)]">{relTime(r.created_at, t)}</span>
            </div>
            <p className="text-xs text-[var(--foreground-muted)]">
              {t("supportOps.refunds.checkerMaker")}: {r.maker_email} ({r.maker_role})
              {r.dispute ? ` · ${r.dispute.customer_name} · ${r.dispute.transaction_reference}` : ""}
            </p>
            <p className="text-xs italic text-[var(--foreground-muted)]">{String(p.reason ?? "")}</p>
            {isSelf && (
              <p className="text-[11px] font-bold text-[var(--state-warning)]">{t("supportOps.refunds.checkerSelf")}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={t("supportOps.refunds.checkerNotes")}
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                className="min-w-56 flex-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
              />
              <button
                onClick={() => void decide(r.id, "APPROVE")}
                disabled={busyId === r.id || (notes[r.id] ?? "").trim().length < 20 || !!isSelf}
                className="rounded-[var(--support-radius-input)] bg-[var(--state-success)] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
              >
                {busyId === r.id ? "…" : t("supportOps.refunds.checkerApprove")}
              </button>
              <button
                onClick={() => void decide(r.id, "REJECT")}
                disabled={busyId === r.id || (notes[r.id] ?? "").trim().length < 20 || !!isSelf}
                className="rounded-[var(--support-radius-input)] bg-[var(--state-danger)] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
              >
                {t("supportOps.refunds.checkerReject")}
              </button>
            </div>
          </div>
        );
      })}

      {!loading && recent.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)]">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-2.5 last:border-b-0">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${r.status === "EXECUTED" ? "bg-[var(--state-success-soft)] text-[var(--state-success)]" : "bg-[var(--state-neutral-soft)] text-[var(--state-neutral)]"}`}>{r.status}</span>
              <p className="min-w-0 flex-1 truncate text-xs text-[var(--foreground-muted)]">
                {r.dispute?.dispute_number ?? String((r.payload as Record<string, unknown>)?.dispute_number ?? "")} · {t("supportOps.refunds.checkerMaker")}: {r.maker_email} · {r.checker_email ?? ""}
              </p>
              <span className="shrink-0 text-[11px] text-[var(--foreground-muted)]">{relTime(r.decided_at ?? r.created_at, t)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
