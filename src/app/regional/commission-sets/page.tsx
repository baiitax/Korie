"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill, statusPillKind } from "@/components/regional/ui";
import { Coins, Layers, Percent } from "lucide-react";

/**
 * Commission sets (regional view) — the platform-wide schedule that prices
 * every aggregator transaction, and what it has actually paid the
 * aggregators operating inside this manager's territory.
 *
 * Both halves come from the commission engine's own tables via
 * /api/regional/commission-sets: the rate rows are the same schedule for
 * every aggregator (the page says so — it never implies a territory-specific
 * one), and the earnings are scoped server-side to the resolved territory.
 */

interface RateSet {
  id: string;
  transactionType: string;
  currency: string;
  minAmount: number;
  maxAmount: number | null;
  customerFeeFlat: number;
  customerFeeBps: number;
  agentCommissionFlat: number;
  agentCommissionBps: number;
  isActive: boolean;
  setAt: string;
}

interface AggregatorRollup {
  aggregatorId: string;
  code: string;
  businessName: string;
  status: string;
  territories: { name: string; stateOrRegion: string }[];
  agentsInTerritory: number;
  byCurrency: Record<string, { earned: number; settled: number; count: number }>;
  commissionCount: number;
  lastEarnedAt: string | null;
}

interface CommissionSetsData {
  sets: RateSet[];
  byAggregator: AggregatorRollup[];
  totals: Record<string, { earned: number; settled: number; count: number }>;
  currencies: string[];
  scopeSummary: { territoryCount: number; aggregatorCount: number; agentCount: number };
  scheduleNote: string;
}

function feeLabel(flat: number, bps: number, t: (k: string) => string): string {
  const parts: string[] = [];
  if (flat !== 0) parts.push(`${t("commissionSets.flat")} ${flat.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  if (bps !== 0) parts.push(`${bps.toLocaleString()} bps`);
  return parts.length ? parts.join(" + ") : t("commissionSets.noFee");
}

function bandLabel(set: RateSet, t: (k: string) => string): string {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return set.maxAmount === null ? `${fmt(set.minAmount)} ${t("commissionSets.andAbove")}` : `${fmt(set.minAmount)} – ${fmt(set.maxAmount)}`;
}

export default function RegionalCommissionSetsPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [data, setData] = useState<CommissionSetsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/commission-sets");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "COMMISSION_SETS_FAILED");
        else if (!cancelled) setData(json.data);
      } catch {
        setError("REGIONAL_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  /* Group the schedule rows into sets: one card per transaction type × currency. */
  const groups = new Map<string, RateSet[]>();
  (data?.sets ?? []).forEach((s) => {
    const key = `${s.transactionType}|${s.currency}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("commissionSets.title")} subtitle={t("commissionSets.subtitle")} />

      {error && <ErrorNote message={error} />}
      {!data && !error && <LoadingRows />}

      {data && data.sets.length === 0 && (
        <EmptyState icon={Percent} title={t("commissionSets.empty")} />
      )}

      {data && data.sets.length > 0 && (
        <>
          {/* ── The schedule ─────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{t("commissionSets.schedule")}</h2>
              <span className="text-[11px] text-[var(--foreground-muted)]">{data.scheduleNote}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from(groups.entries()).map(([key, sets]) => {
                const [txType, currency] = key.split("|");
                return (
                  <div key={key} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[var(--brand-primary)]" />
                        <span className="text-sm font-bold">{txType.replace(/_/g, " ")}</span>
                        <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{currency}</span>
                      </div>
                      <Pill kind="muted">{sets.length} {sets.length === 1 ? "band" : "bands"}</Pill>
                    </div>
                    <div className="space-y-2">
                      {sets.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-[var(--border)] pt-2 first:border-t-0 first:pt-0">
                          <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{bandLabel(s, t)}</span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[var(--foreground-muted)]">
                              {t("commissionSets.customerFee")}: <b className="text-[var(--foreground)]">{feeLabel(s.customerFeeFlat, s.customerFeeBps, t)}</b>
                            </span>
                            <span className="text-[var(--foreground-muted)]">
                              {t("commissionSets.agentCommission")}: <b className="text-[var(--foreground)]">{feeLabel(s.agentCommissionFlat, s.agentCommissionBps, t)}</b>
                            </span>
                            {!s.isActive && <Pill kind="bad">{t("commissionSets.inactive")}</Pill>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Aggregators in the territory ──────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold">{t("commissionSets.aggregators")}</h2>
            {data.byAggregator.length === 0 ? (
              <EmptyState icon={Coins} title={t("commissionSets.noAggregators")} />
            ) : (
              <div className="space-y-3">
                {data.byAggregator.map((agg) => (
                  <div key={agg.aggregatorId} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link href={`/regional/aggregators/${agg.aggregatorId}`} className="text-sm font-bold hover:underline">
                          {agg.businessName} <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{agg.code}</span>
                        </Link>
                        <div className="text-xs text-[var(--foreground-muted)]">
                          {agg.territories.map((tt) => `${tt.name} — ${tt.stateOrRegion}`).join(" · ") || "—"} · {agg.agentsInTerritory} {t("commissionSets.agentsInTerritory")}
                        </div>
                      </div>
                      <Pill kind={statusPillKind(agg.status)}>{agg.status}</Pill>
                    </div>
                    <div className="text-xs space-y-1 pt-1 border-t border-[var(--border)]">
                      {Object.keys(agg.byCurrency).length === 0 ? (
                        <span className="text-[var(--foreground-muted)]">{t("commissionSets.noCommissionsYet")}</span>
                      ) : (
                        Object.entries(agg.byCurrency).map(([cur, b]) => (
                          <div key={cur} className="flex justify-between">
                            <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{cur}</span>
                            <span>
                              {t("commissions.earned")}: <b>{formatCurrency(b.earned, cur)}</b> · {t("commissions.settled")}: {formatCurrency(b.settled, cur)} · {b.count}×
                            </span>
                          </div>
                        ))
                      )}
                      <div className="text-[11px] text-[var(--foreground-muted)]">
                        {t("commissionSets.lastEarned")}: {agg.lastEarnedAt ? formatDate(agg.lastEarnedAt) : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
