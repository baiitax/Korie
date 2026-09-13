"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, StatCard, EmptyState, LoadingRows, ErrorNote, Pill, TrendChart, statusPillKind } from "@/components/regional/ui";
import { Building2, Users, Activity, Wallet, Clock, AlertTriangle, LifeBuoy, ChevronRight, BadgeCheck, FileWarning } from "lucide-react";

interface Overview {
  country: string;
  territories: string[];
  generatedAt: string;
  kpis: {
    aggregators: { total: number; active: number; inactive: number; suspended: number };
    agents: { total: number; active: number; inactive: number; pending: number };
    volumeToday: Record<string, { count: number; volume: number }>;
    volume7d: Record<string, { count: number; volume: number }>;
    volume30d: Record<string, { count: number; volume: number }>;
  };
  health: {
    aggregator: { healthy: number; attention: number; atRisk: number; suspended: number };
    agents: { ACTIVE: number; LOW_ACTIVITY: number; DORMANT: number; NO_ACTIVITY: number };
    liquidity: { HEALTHY: number; MONITOR: number; LOW: number; CRITICAL: number; lowFloatAgents: number };
    transactions: { total30d: number; successRate: number | null; byStatus: Record<string, number> };
    compliance: Record<string, number>;
  };
  trend: Record<string, { date: string; count: number; volume: number }[]>;
  pendingTopups: number;
  openAlerts: number;
  openExceptions: number;
  support: { openTickets: number; slaAtRisk: number; openEscalations: number };
  aggregators: { id: string; code: string; name: string; status: string; kyb: string; tier: string; agentsTotal: number; agentsActive: number; tx30d: { count: number; volume: number; currency: string } }[];
}

export default function RegionalDashboardPage() {
  const { t, formatCurrency, manager, managerError } = useRegional();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await regionalApiFetch("/api/regional/overview");
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message || "OVERVIEW_FAILED");
      else setData(json.data);
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  const vol = (m: Record<string, { count: number; volume: number }> | undefined) => {
    if (!m || Object.keys(m).length === 0) return "0";
    return Object.entries(m)
      .map(([cur, v]) => formatCurrency(v.volume, cur))
      .join(" · ");
  };

  if (managerError) {
    return (
      <div className="p-6 sm:p-8">
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">
          {t("session.error")} — <Link href="/login" className="text-[var(--brand-primary)] hover:underline">{t("session.signInPrompt")}</Link>
        </div>
      </div>
    );
  }

  const h = data?.health;
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("dashboard.commandCenter")}  onRefresh={load} refreshing={loading}>
        {data && <span className="hidden sm:inline text-[11px] text-[var(--foreground-muted)]">{t("common.lastUpdated")}: {new Date(data.generatedAt).toLocaleTimeString()}</span>}
      </PageHeader>

      {error && <ErrorNote message={error} onRetry={load} />}
      {loading && !data ? (
        <LoadingRows rows={6} />
      ) : data ? (
        <>
          {/* KPI command center */}
          <section className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Building2} label={t("dashboard.aggregators")} value={String(data.kpis.aggregators.total)} hint={`${data.kpis.aggregators.active} ${t("dashboard.aggActive")} · ${data.kpis.aggregators.inactive} ${t("dashboard.aggInactive")} · ${data.kpis.aggregators.suspended} ${t("dashboard.aggSuspended")}`} />
              <StatCard icon={Users} label={t("dashboard.agents")} value={String(data.kpis.agents.total)} tone="good" hint={`${data.kpis.agents.active} ${t("dashboard.agentsActive")} · ${data.kpis.agents.inactive} ${t("dashboard.agentsInactive")} · ${data.kpis.agents.pending} ${t("dashboard.agentsPending")}`} />
              <StatCard icon={Activity} label={t("dashboard.volumeToday")} value={vol(data.kpis.volumeToday)} hint={`${t("dashboard.volume7d")}: ${vol(data.kpis.volume7d)}`} />
              <StatCard icon={Wallet} label={t("dashboard.volume30d")} value={vol(data.kpis.volume30d)} hint={Object.values(data.kpis.volume30d).reduce((s, v) => s + v.count, 0) + " " + t("dashboard.txns")} />
            </div>
          </section>

          {/* Regional health */}
          {h && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">{t("dashboard.health")}</h2>
                <span className="text-[10px] text-[var(--foreground-muted)]" title={t("dashboard.healthRules")}>ⓘ {t("dashboard.healthRules")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="text-[11px] font-semibold uppercase text-[var(--foreground-muted)]">{t("dashboard.healthAgg")}</div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span>{t("dashboard.healthy")}</span><b className="text-[var(--brand-primary)]">{h.aggregator.healthy}</b></div>
                    <div className="flex justify-between"><span>{t("dashboard.attention")}</span><b className="text-amber-500">{h.aggregator.attention}</b></div>
                    <div className="flex justify-between"><span>{t("dashboard.atRisk")}</span><b className="text-rose-500">{h.aggregator.atRisk}</b></div>
                    <div className="flex justify-between"><span>{t("dashboard.suspended")}</span><b>{h.aggregator.suspended}</b></div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="text-[11px] font-semibold uppercase text-[var(--foreground-muted)]">{t("dashboard.healthAgents")}</div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span>{t("agents.activity_ACTIVE")}</span><b className="text-[var(--brand-primary)]">{h.agents.ACTIVE}</b></div>
                    <div className="flex justify-between"><span>{t("dashboard.lowActivity")}</span><b className="text-amber-500">{h.agents.LOW_ACTIVITY}</b></div>
                    <div className="flex justify-between"><span>{t("dashboard.dormant")}</span><b className="text-rose-500">{h.agents.DORMANT + h.agents.NO_ACTIVITY}</b></div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="text-[11px] font-semibold uppercase text-[var(--foreground-muted)]">{t("dashboard.healthLiquidity")}</div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span>{t("liquidity.status.HEALTHY")}</span><b className="text-[var(--brand-primary)]">{h.liquidity.HEALTHY}</b></div>
                    <div className="flex justify-between"><span>{t("liquidity.status.MONITOR")}</span><b className="text-sky-500">{h.liquidity.MONITOR}</b></div>
                    <div className="flex justify-between"><span>{t("dashboard.lowFloat")}</span><b className="text-amber-500">{h.liquidity.LOW}</b></div>
                    <div className="flex justify-between"><span>{t("dashboard.criticalFloat")}</span><b className="text-rose-500">{h.liquidity.CRITICAL}</b></div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="text-[11px] font-semibold uppercase text-[var(--foreground-muted)]">{t("dashboard.healthTx")}</div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span>{t("dashboard.successRate")}</span><b className={h.transactions.successRate !== null && h.transactions.successRate >= 0.95 ? "text-[var(--brand-primary)]" : "text-amber-500"}>{h.transactions.successRate !== null ? `${(h.transactions.successRate * 100).toFixed(1)}%` : "—"}</b></div>
                    {Object.entries(h.transactions.byStatus).slice(0, 4).map(([s, n]) => (
                      <div key={s} className="flex justify-between"><span>{s}</span><b>{n}</b></div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="text-[11px] font-semibold uppercase text-[var(--foreground-muted)]">{t("dashboard.healthCompliance")}</div>
                  <div className="mt-2 space-y-1 text-xs">
                    {Object.keys(h.compliance).length === 0 ? (
                      <div className="text-[var(--foreground-muted)]">{t("common.none")}</div>
                    ) : (
                      Object.entries(h.compliance).slice(0, 5).map(([s, n]) => (
                        <div key={s} className="flex justify-between"><span>{s}</span><b>{n}</b></div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Trend + alerts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h3 className="text-sm font-bold mb-3">{t("dashboard.trend30d")}</h3>
              {Object.keys(data.trend).length === 0 ? (
                <div className="text-xs text-[var(--foreground-muted)] py-8 text-center">{t("transactions.empty_transactions")}</div>
              ) : (
                Object.entries(data.trend).map(([cur, series]) => (
                  <div key={cur} className="mb-3 last:mb-0">
                    <div className="text-[10px] font-mono font-bold text-[var(--foreground-muted)] mb-1">{cur}</div>
                    <TrendChart series={series} currency={cur} />
                  </div>
                ))
              )}
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h3 className="text-sm font-bold mb-3">{t("dashboard.alertsEscalations")}</h3>
              <div className="space-y-2">
                <Link href="/regional/risk" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--brand-border)]">
                  <span className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-amber-500" />{t("dashboard.openAlerts")}</span>
                  <Pill kind={data.openAlerts > 0 ? "warn" : "ok"}>{data.openAlerts}</Pill>
                </Link>
                <Link href="/regional/risk" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--brand-border)]">
                  <span className="flex items-center gap-2 text-sm"><FileWarning className="w-4 h-4 text-amber-500" />{t("dashboard.openExceptions")}</span>
                  <Pill kind={data.openExceptions > 0 ? "warn" : "ok"}>{data.openExceptions}</Pill>
                </Link>
                <Link href="/regional/liquidity" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--brand-border)]">
                  <span className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-amber-500" />{t("dashboard.pendingTopups")}</span>
                  <Pill kind={data.pendingTopups > 0 ? "warn" : "ok"}>{data.pendingTopups}</Pill>
                </Link>
                <Link href="/regional/support" className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--brand-border)]">
                  <span className="flex items-center gap-2 text-sm"><LifeBuoy className="w-4 h-4" />{t("dashboard.openTickets")}</span>
                  <Pill kind={data.support.slaAtRisk > 0 ? "warn" : "ok"}>{data.support.openTickets} · {t("dashboard.slaAtRisk")}: {data.support.slaAtRisk}</Pill>
                </Link>
              </div>
            </div>
          </section>

          {/* Aggregator performance */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">{t("dashboard.byAggregator")}</h2>
              <Link href="/regional/aggregators" className="text-xs font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1">
                {t("common.viewAll")} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {data.aggregators.length === 0 ? (
              <EmptyState icon={Building2} title={t("dashboard.noAggregators")} body={t("dashboard.noAggregatorsBody")} />
            ) : (
              <div className="space-y-3">
                {data.aggregators.map((agg) => (
                  <Link key={agg.id} href={`/regional/aggregators/${agg.id}`} className="block p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-border)] transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold truncate">{agg.name}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)]">{agg.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Pill kind={statusPillKind(agg.status)}>{agg.status}</Pill>
                        <Pill kind="muted">KYB {agg.kyb}</Pill>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-[var(--foreground-muted)]">{t("dashboard.agents")}</div>
                        <div className="font-bold">{agg.agentsTotal}</div>
                      </div>
                      <div>
                        <div className="text-[var(--foreground-muted)]">{t("dashboard.agentsActive")}</div>
                        <div className="font-bold text-[var(--brand-primary)]">{agg.agentsActive}</div>
                      </div>
                      <div>
                        <div className="text-[var(--foreground-muted)]">{t("dashboard.volume30d")}</div>
                        <div className="font-bold font-mono">{formatCurrency(agg.tx30d.volume, agg.tx30d.currency)} <span className="text-[var(--foreground-muted)]">({agg.tx30d.count})</span></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
