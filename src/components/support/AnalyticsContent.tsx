"use client";

// =============================================================================
// File: src/components/support/AnalyticsContent.tsx
// Description: Analytics content (spec §57–§59) — agent performance, SLA
// compliance, CSAT, escalations, reopens. Metrics are computed server-side
// from stored records; this component renders, it never computes.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Gauge, Star } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, LoadingPanel, OfflineBanner, SectionCard } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

export interface AnalyticsData {
  generatedAt: string;
  range: string;
  agentStats: {
    officerId: string; officerName: string; role: string; tier: string;
    resolved: number; open: number; avgResolutionHours: number; csatAvg: number | null;
    escalations: number; reopens: number; slaComplianceRate: number;
  }[];
  slaComplianceRate: number;
  resolutionByPriority: { priority: string; resolved: number; withinTarget: number; rate: number }[];
  csat: { average: number | null; count: number; distribution: Record<string, number>; byLanguage: { language: string; average: number | null; count: number }[] };
  escalations: { total: number; open: number; byDestination: { destination: string; label: string; count: number }[]; resolutionRate: number };
  reopens: { total: number; rate: number };
}

export function AnalyticsContent({ initialTab }: { initialTab?: "agents" | "sla" | "csat" }) {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [tab, setTab] = useState<"agents" | "sla" | "csat">(initialTab ?? "agents");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.analytics(activeOfficer?.id);
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

  const tabs = useMemo(
    () => [
      { key: "agents" as const, label: t("supportOps.analytics.agents"), icon: <BarChart3 className="h-3.5 w-3.5" /> },
      { key: "sla" as const, label: t("supportOps.analytics.sla"), icon: <Gauge className="h-3.5 w-3.5" /> },
      { key: "csat" as const, label: t("supportOps.analytics.csat"), icon: <Star className="h-3.5 w-3.5" /> },
    ],
    [t],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.analytics.title")}</h1>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="flex items-center gap-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-fit" role="tablist">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${
              tab === tb.key ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]" : "text-[var(--muted)]"
            }`}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {loading && <LoadingPanel rows={7} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!loading && !error && data && (
        <>
          {tab === "agents" && (
            <SectionCard title={t("supportOps.analytics.agents")}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                      <th className="py-2 pr-3">{t("supportOps.analytics.table.officer")}</th>
                      <th className="py-2 pr-3 text-right">{t("supportOps.analytics.table.resolved")}</th>
                      <th className="py-2 pr-3 text-right">{t("supportOps.analytics.table.open")}</th>
                      <th className="py-2 pr-3 text-right">{t("supportOps.analytics.table.avgResolution")}</th>
                      <th className="py-2 pr-3 text-right">{t("supportOps.analytics.table.csat")}</th>
                      <th className="py-2 pr-3 text-right">{t("supportOps.analytics.table.escalations")}</th>
                      <th className="py-2 pr-3 text-right">{t("supportOps.analytics.table.reopens")}</th>
                      <th className="py-2 text-right">{t("supportOps.analytics.table.compliance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agentStats.map((a) => (
                      <tr key={a.officerId} className="border-b border-[var(--card-border)] last:border-b-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-extrabold text-[var(--foreground)]">{a.officerName}</p>
                          <p className="text-[10px] text-[var(--muted)]">{t(`supportOps.roles.${a.role}`)}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{a.resolved}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.open}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.avgResolutionHours}h</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.csatAvg ? a.csatAvg.toFixed(2) : "—"}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.escalations}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.reopens}</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`font-extrabold tabular-nums ${
                              a.slaComplianceRate >= 90
                                ? "text-[var(--state-success)]"
                                : a.slaComplianceRate >= 75
                                  ? "text-[var(--state-warning)]"
                                  : "text-[var(--state-danger)]"
                            }`}
                          >
                            {a.slaComplianceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {tab === "sla" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title={t("supportOps.analytics.sla")}>
                <p className="text-4xl font-extrabold tabular-nums text-[var(--state-success)]">{data.slaComplianceRate}%</p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{t("supportOps.analytics.withinTarget")}</p>
              </SectionCard>
              <SectionCard title={t("supportOps.analytics.byPriority")}>
                <div className="space-y-3">
                  {data.resolutionByPriority.map((p) => (
                    <div key={p.priority}>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold">
                        <span>{t(`supportOps.priorities.${p.priority}`)}</span>
                        <span className="tabular-nums text-[var(--muted)]">
                          {p.withinTarget}/{p.resolved} · {p.rate}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <div
                          className={`h-full rounded-full ${p.rate >= 90 ? "bg-[var(--state-success)]" : p.rate >= 75 ? "bg-[var(--state-warning)]" : "bg-[var(--state-danger)]"}`}
                          style={{ width: `${p.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {tab === "csat" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title={t("supportOps.analytics.csat")}>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-extrabold tabular-nums text-[var(--brand-gold-ink)]">
                    {data.csat.average ? data.csat.average.toFixed(2) : "—"}
                  </p>
                  <p className="pb-1 text-xs font-bold text-[var(--muted)]">/ 5 · {data.csat.count}</p>
                </div>
                <div className="mt-4 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = data.csat.distribution[String(s)] ?? 0;
                    const max = Math.max(1, ...Object.values(data.csat.distribution));
                    return (
                      <div key={s} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-right font-extrabold tabular-nums">{s}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                          <div className="h-full rounded-full bg-[var(--brand-gold)]" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right tabular-nums text-[var(--muted)]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
              <SectionCard title={t("supportOps.analytics.byLanguage")}>
                {data.csat.byLanguage.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--muted)]">{t("supportOps.analytics.noData")}</p>
                ) : (
                  <div className="space-y-2">
                    {data.csat.byLanguage.map((l) => (
                      <div key={l.language} className="flex items-center justify-between rounded-[10px] bg-[var(--surface-2)] px-3 py-2.5">
                        <span className="text-xs font-extrabold uppercase text-[var(--foreground)]">{l.language}</span>
                        <span className="text-sm font-extrabold tabular-nums">
                          {l.average ? l.average.toFixed(2) : "—"} <span className="text-[10px] font-bold text-[var(--muted)]">/ 5 · {l.count}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
