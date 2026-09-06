"use client";

// =============================================================================
// File: src/app/support/page.tsx
// Description: KoriePay Support — Command Center (dashboard, §101).
// KPIs + immediate-attention + trend + categories + LIVE service health +
// recent activity. Every number comes from the server overview endpoint.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock, Inbox, Siren, UserCheck, Users, Zap } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, HealthDot, LoadingPanel, OfflineBanner, SectionCard, StatCard, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, OverviewDto } from "@/services/supportOpsClient";

const RANGES = ["24H", "7D", "30D", "90D"] as const;
type Range = (typeof RANGES)[number];

export default function SupportDashboardPage() {
  const { t, activeOfficer, isOnline, toast } = useSupportOps();
  const router = useRouter();
  const [range, setRange] = useState<Range>("24H");
  const [data, setData] = useState<OverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.overview(range, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setData(res);
    setLoading(false);
  }, [range, activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">{t("supportOps.dashboard.title")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] p-1" role="group" aria-label={t("supportOps.dashboard.trendTitle", { range: range === "24H" ? 1 : range === "7D" ? 7 : range === "30D" ? 30 : 90 })}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-colors ${
                range === r ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      {error && !loading && <ErrorState message={error} onRetry={() => void load()} />}

      {loading && !data ? (
        <LoadingPanel rows={8} />
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label={t("supportOps.dashboard.openTickets")}
              value={data.kpis.openTickets}
              tone="info"
              onClick={() => router.push("/support/inbox")}
            />
            <StatCard
              label={t("supportOps.dashboard.critical")}
              value={data.kpis.critical}
              tone={data.kpis.critical > 0 ? "danger" : "neutral"}
              onClick={() => router.push("/support/inbox?priority=CRITICAL&open=1")}
            />
            <StatCard
              label={t("supportOps.dashboard.slaAtRisk")}
              value={data.kpis.slaAtRisk}
              tone={data.kpis.slaAtRisk > 0 ? "warning" : "neutral"}
              onClick={() => router.push("/support/inbox")}
            />
            <StatCard
              label={t("supportOps.dashboard.waitingForCustomer")}
              value={data.kpis.waitingForCustomer}
              tone="neutral"
              onClick={() => router.push("/support/inbox?status=WAITING_FOR_CUSTOMER&open=1")}
            />
            <StatCard
              label={t("supportOps.dashboard.unassigned")}
              value={data.kpis.unassigned}
              tone={data.kpis.unassigned > 0 ? "warning" : "neutral"}
              onClick={() => router.push("/support/inbox?unassigned=1&open=1")}
            />
            <StatCard label={t("supportOps.dashboard.resolvedToday")} value={data.kpis.resolvedToday} tone="success" />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Attention center */}
            <SectionCard title={t("supportOps.dashboard.attentionTitle")} tone={data.attention.criticalTickets > 0 ? "danger" : undefined}>
              <div className="space-y-2">
                <AttentionRow
                  icon={<Siren className="h-4 w-4" />}
                  label={t("supportOps.dashboard.criticalTickets")}
                  value={data.attention.criticalTickets}
                  tone="danger"
                  onClick={() => router.push("/support/inbox?priority=CRITICAL&open=1")}
                />
                <AttentionRow
                  icon={<Clock className="h-4 w-4" />}
                  label={t("supportOps.dashboard.slaBreached")}
                  value={data.attention.slaBreachedOrAtRisk}
                  tone="warning"
                  onClick={() => router.push("/support/inbox")}
                />
                <AttentionRow
                  icon={<Zap className="h-4 w-4" />}
                  label={t("supportOps.dashboard.fraudEscalations")}
                  value={data.attention.fraudEscalations}
                  tone="danger"
                  onClick={() => router.push("/support/escalations?destination=FRAUD_RISK")}
                />
                <AttentionRow
                  icon={<Inbox className="h-4 w-4" />}
                  label={t("supportOps.dashboard.transactionDisputes")}
                  value={data.attention.transactionDisputes}
                  tone="warning"
                  onClick={() => router.push("/support/disputes")}
                />
                <AttentionRow
                  icon={<Users className="h-4 w-4" />}
                  label={t("supportOps.dashboard.bankingIssues")}
                  value={data.attention.bankingIssues}
                  tone="info"
                  onClick={() => router.push("/support/inbox?category=AGENT_FLOAT&open=1")}
                />
              </div>
            </SectionCard>

            {/* Trend */}
            <SectionCard
              title={t("supportOps.dashboard.trendTitle", { range: range === "24H" ? 1 : range === "7D" ? 7 : range === "30D" ? 30 : 90 })}
              subtitle={`${t("supportOps.dashboard.avgResolution")}: ${data.trend.avgResolutionHours}h`}
            >
              <TrendChart labels={data.trend.labels} created={data.trend.created} resolved={data.trend.resolved} />
              <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-[var(--foreground-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-accent)]" /> {t("supportOps.dashboard.created")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[var(--state-success)]" /> {t("supportOps.dashboard.resolved")}
                </span>
              </div>
            </SectionCard>

            {/* Categories */}
            <SectionCard title={t("supportOps.dashboard.categoriesTitle")}>
              <div className="space-y-2">
                {data.categories.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
                )}
                {data.categories.map((c) => {
                  const max = Math.max(1, ...data.categories.map((x) => x.count));
                  return (
                    <div key={c.key}>
                      <div className="mb-0.5 flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-[var(--foreground)]">{t(`supportOps.categories.${c.key}`)}</span>
                        <span className="tabular-nums text-[var(--muted)]">{c.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${(c.count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Service health — live, never simulated (§15) */}
            <SectionCard
              title={t("supportOps.dashboard.healthTitle")}
              subtitle={
                data.serviceHealth.some((h) => h.status !== "OPERATIONAL")
                  ? t("supportOps.dashboard.healthIssues")
                  : t("supportOps.dashboard.healthAll")
              }
              action={
                <button onClick={() => router.push("/support/system-health")} className="flex items-center gap-1 text-[11px] font-extrabold text-[var(--brand-primary)] hover:underline">
                  {t("supportOps.nav.systemHealth")} <ArrowUpRight className="h-3 w-3" />
                </button>
              }
            >
              <div className="space-y-2">
                {data.serviceHealth.map((h) => (
                  <div key={h.key} className="flex items-start gap-2.5 rounded-[10px] bg-[var(--surface-2)] px-3 py-2">
                    <HealthDot status={h.status} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--foreground)]">{h.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--foreground-muted)]">{h.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Recent activity */}
            <SectionCard
              title={t("supportOps.dashboard.activityTitle")}
              className="lg:col-span-2"
              action={
                <button onClick={() => router.push("/support/audit")} className="flex items-center gap-1 text-[11px] font-extrabold text-[var(--brand-primary)] hover:underline">
                  {t("supportOps.nav.audit")} <ArrowUpRight className="h-3 w-3" />
                </button>
              }
            >
              <div className="space-y-1">
                {data.recentActivity.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
                )}
                {data.recentActivity.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                      <UserCheck className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--foreground)]">
                        <span className="font-extrabold">{a.officerName}</span> — {a.details}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">{a.action} · {a.entityType}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--muted)]">{relTime(a.timestamp, t)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- pieces */

function AttentionRow({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "danger" | "warning" | "info";
  onClick: () => void;
}) {
  const toneCls =
    tone === "danger" ? "text-[var(--state-danger)] bg-[var(--state-danger-soft)]"
    : tone === "warning" ? "text-[var(--state-warning)] bg-[var(--state-warning-soft)]"
    : "text-[var(--state-info)] bg-[var(--state-info-soft)]";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[10px] border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneCls}`}>{icon}</span>
      <span className="flex-1 text-[13px] font-semibold text-[var(--foreground)]">{label}</span>
      <span className={`grid h-7 min-w-[28px] place-items-center rounded-full px-2 text-[13px] font-extrabold tabular-nums ${value > 0 ? toneCls : "bg-[var(--surface-3)] text-[var(--muted)]"}`}>
        {value}
      </span>
    </button>
  );
}

function TrendChart({ labels, created, resolved }: { labels: string[]; created: number[]; resolved: number[] }) {
  const max = Math.max(1, ...created, ...resolved);
  const W = 560;
  const H = 140;
  const pad = 4;
  const n = Math.max(created.length, 1);
  const bw = (W - pad * 2) / n;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full min-w-[380px]" role="img" aria-label="volume trend">
        {labels.map((l, i) => (
          <g key={i}>
            <rect
              x={pad + i * bw + bw * 0.12}
              y={H - (created[i] / max) * (H - 12)}
              width={bw * 0.32}
              height={Math.max(2, (created[i] / max) * (H - 12))}
              rx={3}
              className="fill-[var(--brand-accent)]"
            />
            <rect
              x={pad + i * bw + bw * 0.5}
              y={H - (resolved[i] / max) * (H - 12)}
              width={bw * 0.32}
              height={Math.max(2, (resolved[i] / max) * (H - 12))}
              rx={3}
              className="fill-[var(--state-success)]"
            />
            <text x={pad + i * bw + bw / 2} y={H + 14} textAnchor="middle" className="fill-[var(--muted)] text-[9px] font-semibold">
              {l}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
