"use client";

// =============================================================================
// File: src/app/support/refunds/page.tsx
// Description: Refunds & Reversals (spec §31).
//
// Two real sources, clearly labelled:
//   1. Support disputes carrying financial decisions (this portal's records).
//   2. Recovery cases from DisputeChargebackEngine — the AUTHORITATIVE
//      execution state. Support only ever requests; it never executes and
//      never touches balances.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, BadgeDollarSign } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

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
  const [tab, setTab] = useState<"refunds" | "reversals">("refunds");

  // /support/reversals redirects here with ?tab=reversals (§107).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "reversals") setTab("reversals");
  }, []);
  const [data, setData] = useState<RefundsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.refunds(activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setData(res);
    setLoading(false);
  }, [activeOfficer?.id]);

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
        {(["refunds", "reversals"] as const).map((tb) => (
          <button
            key={tb}
            role="tab"
            aria-selected={tab === tb}
            onClick={() => setTab(tb)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${
              tab === tb ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]" : "text-[var(--muted)]"
            }`}
          >
            {tb === "refunds" ? <BadgeDollarSign className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
            {tb === "refunds" ? t("supportOps.refunds.tabRefunds") : t("supportOps.refunds.tabReversals")}
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
