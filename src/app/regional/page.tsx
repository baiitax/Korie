"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { Building2, Users, Activity, Wallet, Clock, AlertTriangle, FileWarning, Target, BadgeCheck, ChevronRight, RefreshCw } from "lucide-react";

interface AggregatorSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  kyb: string;
  tier: string;
  agentsTotal: number;
  agentsActive: number;
  territories: { id: string; name: string; code: string; stateOrRegion: string }[];
}

interface Overview {
  country: string;
  territories: string[];
  aggregators: AggregatorSummary[];
  agents: { total: number; active: number; pending: number; suspended: number; kycVerified: number };
  volumeByCurrency: Record<string, { count: number; volume: number }>;
  volume30dByCurrency: Record<string, { count: number; volume: number }>;
  floatByCurrency: Record<string, number>;
  floatAccountCount: number;
  pendingTopups: number;
  openAlerts: number;
  openExceptions: number;
  activeTargets: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "good";
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-500"
      : tone === "good"
        ? "text-teal-500"
        : "text-[var(--foreground)]";
  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-[11px] font-medium uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className={`text-xl sm:text-2xl font-bold truncate ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-[var(--muted)] truncate">{hint}</div>}
    </div>
  );
}

export default function RegionalDashboardPage() {
  const { t, formatCurrency, manager, managerError } = useRegional();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await regionalApiFetch("/api/regional/overview");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "OVERVIEW_FAILED");
      } else {
        setData(json.data);
        setUpdatedAt(new Date().toISOString());
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  const volumeLine = (data: Overview | null) => {
    if (!data) return "—";
    const entries = Object.entries(data.volume30dByCurrency);
    if (entries.length === 0) return "0";
    return entries.map(([cur, v]) => formatCurrency(v.volume, cur)).join(" · ");
  };
  const floatLine = (data: Overview | null) => {
    if (!data) return "—";
    const entries = Object.entries(data.floatByCurrency);
    if (entries.length === 0) return "0";
    return entries.map(([cur, v]) => formatCurrency(v, cur)).join(" · ");
  };

  if (managerError) {
    return (
      <div className="p-6 sm:p-8">
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--muted)]">
          {t("session.error")} — <Link href="/login" className="text-teal-500 hover:underline">{t("session.signInPrompt")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">{t("dashboard.subtitle")}</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500">{error}</div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Building2} label={t("dashboard.aggregators")} value={String(data.aggregators.length)} hint={data.territories.join(" · ")} />
            <StatCard icon={Users} label={t("dashboard.agentsActive")} value={String(data.agents.active)} tone="good" hint={`${t("dashboard.agentsTotal")}: ${data.agents.total}`} />
            <StatCard icon={BadgeCheck} label={t("dashboard.kycVerified")} value={String(data.agents.kycVerified)} hint={`${data.agents.pending} pending · ${data.agents.suspended} suspended`} />
            <StatCard icon={Activity} label={t("dashboard.volume30d")} value={volumeLine(data)} hint={`${Object.values(data.volumeByCurrency).reduce((s, v) => s + v.count, 0)} ${t("dashboard.transactions")} ${t("dashboard.allTime")}`} />
            <StatCard icon={Wallet} label={t("dashboard.floatTotal")} value={floatLine(data)} hint={`${data.floatAccountCount} ${t("float.accounts").toLowerCase()}`} />
            <StatCard icon={Clock} label={t("dashboard.pendingTopups")} value={String(data.pendingTopups)} tone={data.pendingTopups > 0 ? "warn" : "default"} />
            <StatCard icon={AlertTriangle} label={t("dashboard.openAlerts")} value={String(data.openAlerts)} tone={data.openAlerts > 0 ? "warn" : "default"} />
            <StatCard icon={FileWarning} label={t("dashboard.openExceptions")} value={String(data.openExceptions)} tone={data.openExceptions > 0 ? "warn" : "default"} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t("dashboard.byAggregator")}</h2>
              {updatedAt && (
                <span className="text-[11px] text-[var(--muted)]">
                  {t("common.lastUpdated")}: {new Date(updatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            {data.aggregators.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
                <Target className="w-8 h-8 mx-auto text-[var(--muted)] mb-3" />
                <div className="text-sm font-semibold">{t("dashboard.noAggregators")}</div>
                <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">{t("dashboard.noAggregatorsBody")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.aggregators.map((agg) => (
                  <div key={agg.id} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold truncate">{agg.name}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">{agg.code}</span>
                        </div>
                        <div className="text-xs text-[var(--muted)] mt-1">
                          {agg.territories.map((tr) => tr.stateOrRegion).join(" · ")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            agg.status === "ACTIVE" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {agg.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                          KYB {agg.kyb}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-[var(--muted)]">{t("dashboard.agentsTotal")}</div>
                        <div className="font-bold">{agg.agentsTotal}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">{t("dashboard.agentsActive")}</div>
                        <div className="font-bold text-teal-500">{agg.agentsActive}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted)]">{t("dashboard.activeTargets")}</div>
                        <div className="font-bold">{data.activeTargets}</div>
                      </div>
                    </div>
                    <Link href="/regional/agents" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-500 hover:underline">
                      {t("common.viewAll")} <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
