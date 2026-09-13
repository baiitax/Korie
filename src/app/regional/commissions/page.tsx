"use client";

import React, { useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill, StatCard } from "@/components/regional/ui";
import { Coins, TrendingUp } from "lucide-react";

interface CommissionsData {
  currencies: string[];
  totals: Record<string, { earned: number; settled: number; count: number }>;
  byStatus: Record<string, number>;
  byAgent: { code: string; name: string; state: string; byCurrency: Record<string, { earned: number; settled: number; count: number }>; lastEarnedAt: string | null }[];
  monthlyTrend: Record<string, Record<string, number>>;
  transactionLinked: Record<string, { successful: number; total: number }>;
}

export default function RegionalCommissionsPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [data, setData] = useState<CommissionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/commissions");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "COMMISSIONS_FAILED");
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

  const hasAny = data && (data.currencies.length > 0 || data.byAgent.length > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("commissions.title")} subtitle={t("commissions.subtitle")} />

      {error && <ErrorNote message={error} />}
      {!data && !error ? (
        <LoadingRows />
      ) : data && !hasAny ? (
        <EmptyState icon={Coins} title={t("commissions.empty")} />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(data.totals).map(([cur, v]) => (
              <StatCard key={cur} icon={Coins} label={`${cur} · ${t("commissions.earned")}`} value={formatCurrency(v.earned, cur)} hint={`${v.count} ×`} />
            ))}
            {Object.entries(data.totals).map(([cur, v]) => (
              <StatCard key={cur + "-s"} icon={TrendingUp} label={`${cur} · ${t("commissions.settled")}`} value={formatCurrency(v.settled, cur)} tone="good" />
            ))}
          </div>

          {/* Monthly trend */}
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("commissions.monthly")}</h2>
            {Object.keys(data.monthlyTrend).length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">{t("commissions.empty")}</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.monthlyTrend).map(([cur, months]) => (
                  <div key={cur}>
                    <div className="text-[10px] font-mono font-bold text-[var(--foreground-muted)] mb-1">{cur}</div>
                    <div className="flex items-end gap-2 h-24">
                      {Object.entries(months).sort().map(([m, v]) => {
                        const max = Math.max(1, ...Object.values(months));
                        return (
                          <div key={m} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <div className="w-full rounded-t-lg bg-[var(--brand-primary)]/70" style={{ height: `${Math.max(4, (v / max) * 80)}px` }} title={formatCurrency(v, cur)} />
                            <span className="text-[9px] font-mono text-[var(--foreground-muted)]">{m.slice(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Transaction-linked */}
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("commissions.transactionLinked")}</h2>
            {Object.keys(data.transactionLinked).length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">{t("commissions.empty")}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(data.transactionLinked).map(([cur, v]) => (
                  <div key={cur} className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs">
                    <div className="font-mono font-bold text-[10px] text-[var(--foreground-muted)] mb-1">{cur}</div>
                    <div className="flex justify-between"><span>SUCCESSFUL</span><b className="font-mono">{formatCurrency(v.successful, cur)}</b></div>
                    <div className="flex justify-between"><span>{t("common.total", { count: 0 }).split(" ")[0] ?? ""} ALL</span><b className="font-mono">{formatCurrency(v.total, cur)}</b></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* By agent */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("commissions.byAgent")}</h2>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-semibold">{t("agents.col.agent")}</th>
                    <th className="px-4 py-3 font-semibold">{t("agents.col.state")}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t("commissions.earned")}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t("commissions.settled")}</th>
                    <th className="px-4 py-3 font-semibold">{t("commissions.lastEarned")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAgent.map((a) => (
                    <tr key={a.code} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{a.code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{a.state}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {Object.entries(a.byCurrency).map(([cur, v]) => <div key={cur}>{formatCurrency(v.earned, cur)}</div>)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {Object.entries(a.byCurrency).map(([cur, v]) => <div key={cur}>{formatCurrency(v.settled, cur)}</div>)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] whitespace-nowrap">{formatDate(a.lastEarnedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {Object.entries(data.byStatus).map(([s, n]) => <Pill key={s} kind="muted">{s}: {n}</Pill>)}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
