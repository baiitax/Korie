"use client";

import React, { useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, LoadingRows, ErrorNote, TrendChart, Pill, PlannedBadge, EmptyState } from "@/components/regional/ui";
import { BarChart3 } from "lucide-react";

interface PerfData {
  dailyTrend: Record<string, { date: string; count: number; volume: number }[]>;
  agentRows: { code: string; name: string; state: string; status: string; aggregator: string | null; tx30d: number; volume30d: number; currency: string; successRate: number | null; activity: string; registeredAt: string }[];
  comparison: { aggregatorId: string; code: string; name: string; txCount30d: number; activeAgents: number; newAgents30d: number; totalAgents: number; successRate: number | null; volumes: Record<string, number> }[];
  scoringStatus: string;
  scoringNote: string;
}

export default function RegionalPerformancePage() {
  const { t, formatCurrency, manager, managerError } = useRegional();
  const [data, setData] = useState<PerfData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/performance");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "PERF_FAILED");
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("performance.title")} subtitle={t("performance.subtitle")} />
      <div className="flex items-center gap-3 flex-wrap">
        <PlannedBadge label={t("performance.scoringPlanned")} />
        <span className="text-[11px] text-[var(--foreground-muted)] max-w-xl">{t("performance.scoringNote")}</span>
      </div>

      {error && <ErrorNote message={error} />}
      {!data && !error ? (
        <LoadingRows />
      ) : data ? (
        <>
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("performance.trend")}</h2>
            {Object.keys(data.dailyTrend).length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">{t("transactions.empty_transactions")}</div>
            ) : (
              Object.entries(data.dailyTrend).map(([cur, series]) => (
                <div key={cur} className="mb-4 last:mb-0">
                  <div className="text-[10px] font-mono font-bold text-[var(--foreground-muted)] mb-1">{cur}</div>
                  <TrendChart series={series} currency={cur} height={100} />
                </div>
              ))
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("performance.comparison")}</h2>
            {data.comparison.length === 0 ? (
              <EmptyState icon={BarChart3} title={t("dashboard.noAggregators")} />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">{t("performance.col.aggregator")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("performance.col.tx")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("performance.col.volume")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("performance.col.activeAgents")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("performance.col.newAgents")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("performance.col.success")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.comparison.map((c, i) => (
                      <tr key={c.aggregatorId} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-muted)]">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{c.code}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{c.txCount30d}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {Object.keys(c.volumes).length === 0 ? "—" : Object.entries(c.volumes).map(([cur, v]) => <div key={cur}>{formatCurrency(v, cur)}</div>)}
                        </td>
                        <td className="px-4 py-3 text-right">{c.activeAgents}/{c.totalAgents}</td>
                        <td className="px-4 py-3 text-right text-[var(--brand-primary)] font-bold">{c.newAgents30d}</td>
                        <td className="px-4 py-3 text-right font-mono">{c.successRate !== null ? `${(c.successRate * 100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("performance.agents")}</h2>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-semibold">{t("agents.col.agent")}</th>
                    <th className="px-4 py-3 font-semibold">{t("agents.col.state")}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t("performance.col.tx")}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t("performance.col.volume")}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t("performance.col.success")}</th>
                    <th className="px-4 py-3 font-semibold">{t("agents.filterActivity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentRows.slice(0, 50).map((a) => (
                    <tr key={a.code} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{a.code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{a.state}</td>
                      <td className="px-4 py-3 text-right font-mono">{a.tx30d}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{a.tx30d > 0 ? formatCurrency(a.volume30d, a.currency) : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{a.successRate !== null ? `${(a.successRate * 100).toFixed(0)}%` : "—"}</td>
                      <td className="px-4 py-3"><Pill kind={a.activity === "ACTIVE" ? "ok" : a.activity === "LOW_ACTIVITY" ? "info" : "muted"}>{t(`agents.activity_${a.activity}`)}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
