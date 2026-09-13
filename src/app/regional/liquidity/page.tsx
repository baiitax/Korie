"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill, StatCard } from "@/components/regional/ui";
import { Wallet, AlertTriangle, Clock, Lock, Check, X, Loader2 } from "lucide-react";

interface HeatCell {
  aggregatorId: string;
  aggregatorCode: string;
  aggregatorName: string;
  currency: string;
  available: number;
  reserved: number;
  thresholdMin: number | null;
  coverage: number | null;
  status: "HEALTHY" | "MONITOR" | "LOW" | "CRITICAL";
  accounts: number;
}
interface LiquidityData {
  country: string;
  currencies: string[];
  totals: Record<string, { available: number; reserved: number }>;
  pendingTotals: Record<string, number>;
  heatmap: HeatCell[];
  houseAccounts: { aggregator: string; kind: string; name: string; currency: string | null; balance: number; locked: number }[];
  lowFloat: { agentCode: string; agentName: string; state: string; currency: string; balance: number; threshold: number | null; status: string }[];
  pending: { id: string; agentCode: string; agentName: string; amount: number; currency: string; method: string | null; status: string; requestedAt: string }[];
  rules: string;
}

function heatKind(status: string): "ok" | "info" | "warn" | "bad" {
  if (status === "HEALTHY") return "ok";
  if (status === "MONITOR") return "info";
  if (status === "LOW") return "warn";
  return "bad";
}

export default function RegionalLiquidityPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [data, setData] = useState<LiquidityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await regionalApiFetch("/api/regional/liquidity");
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message || "LIQUIDITY_FAILED");
      else setData(json.data);
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    }
  }, []);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    if (decision === "APPROVED" && !window.confirm(t("float.confirmApprove"))) return;
    setBusyId(id);
    setNotice(null);
    setError(null);
    try {
      const res = await regionalApiFetch("/api/regional/float-review", {
        method: "POST",
        body: JSON.stringify({ requestId: id, decision }),
      });
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message || "DECISION_FAILED");
      else {
        setNotice(decision === "APPROVED" ? t("float.approved") : t("float.rejected"));
        await load();
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    } finally {
      setBusyId(null);
    }
  };

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("liquidity.title")} subtitle={t("liquidity.subtitle")} onRefresh={load} />

      {error && <ErrorNote message={error} onRetry={load} />}
      {notice && <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-primary)]/10 text-sm text-[var(--brand-primary)]">{notice}</div>}

      {data ? (
        <>
          {/* Regional totals per currency */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("liquidity.regional")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.currencies.length === 0 ? (
                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("common.none")}</div>
              ) : (
                data.currencies.map((cur) => (
                  <div key={cur} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono font-bold text-[var(--foreground-muted)] mb-2">{cur}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-[var(--foreground-muted)]">{t("liquidity.available")}</div>
                        <div className="font-bold font-mono text-sm">{formatCurrency(data.totals[cur]?.available ?? 0, cur)}</div>
                      </div>
                      <div>
                        <div className="text-[var(--foreground-muted)]">{t("liquidity.reserved")}</div>
                        <div className="font-bold font-mono text-sm">{formatCurrency(data.totals[cur]?.reserved ?? 0, cur)}</div>
                      </div>
                      <div>
                        <div className="text-[var(--foreground-muted)]">{t("liquidity.pending")}</div>
                        <div className="font-bold font-mono text-sm">{formatCurrency(data.pendingTotals[cur] ?? 0, cur)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[10px] text-[var(--foreground-muted)] mt-2">ⓘ {t("liquidity.rules")}: {data.rules}</p>
          </section>

          {/* Heatmap */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("liquidity.heatmap")}</h2>
            {data.heatmap.length === 0 ? (
              <EmptyState icon={Wallet} title={t("common.none")} />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                      <th className="px-4 py-3 font-semibold">{t("aggregators.col.aggregator")}</th>
                      <th className="px-4 py-3 font-semibold">{t("common.currency")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("liquidity.available")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("liquidity.reserved")}</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("liquidity.coverage")}</th>
                      <th className="px-4 py-3 font-semibold text-center">{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.heatmap.map((c, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{c.aggregatorName}</div>
                          <div className="text-[10px] font-mono text-[var(--foreground-muted)]">{c.aggregatorCode} · {c.accounts} accts</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{c.currency}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(c.available, c.currency)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-[var(--foreground-muted)]">{formatCurrency(c.reserved, c.currency)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{c.coverage !== null ? `${c.coverage.toFixed(2)}×` : "—"}</td>
                        <td className="px-4 py-3 text-center"><Pill kind={heatKind(c.status)}>{t(`liquidity.status.${c.status}`)}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* House accounts */}
          {data.houseAccounts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("liquidity.houseAccounts")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.houseAccounts.map((a, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono font-bold text-[var(--foreground-muted)]">{a.kind} · {a.currency}</div>
                    <div className="text-sm font-bold font-mono">{formatCurrency(a.balance, a.currency ?? "NGN")}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)] flex items-center gap-1"><Lock className="w-3 h-3" />{t("liquidity.reserved")}: {formatCurrency(a.locked, a.currency ?? "NGN")}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)] truncate">{a.aggregator}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Low float agents */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("liquidity.lowFloat")}</h2>
            {data.lowFloat.length === 0 ? (
              <EmptyState icon={AlertTriangle} title={t("liquidity.emptyLowFloat")} />
            ) : (
              <div className="space-y-2">
                {data.lowFloat.map((a, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-[var(--surface)] border border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">{a.agentName} <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{a.agentCode}</span></div>
                      <div className="text-[11px] text-[var(--foreground-muted)]">{a.state} · {t("liquidity.coverage")}: {(a.balance / Math.max(1, a.threshold ?? 1)).toFixed(2)}×</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold">{formatCurrency(a.balance, a.currency)}</div>
                      <Pill kind={a.status === "CRITICAL" ? "bad" : "warn"}>{t(`liquidity.status.${a.status}`)}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Review queue */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">
              {t("liquidity.queue")} · {data.pending.length}
            </h2>
            {data.pending.length === 0 ? (
              <EmptyState icon={Clock} title={t("float.emptyQueue")} />
            ) : (
              <div className="space-y-3">
                {data.pending.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-[var(--surface)] border border-amber-500/30 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{r.agentName} <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{r.agentCode}</span></div>
                      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">{formatDate(r.requestedAt)} · {r.method || "—"}</div>
                      <div className="text-lg font-bold font-mono mt-1">{formatCurrency(r.amount, r.currency)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void decide(r.id, "APPROVED")} disabled={busyId === r.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--brand-primary)] text-[var(--brand-on-primary,#052e2b)] disabled:opacity-50">
                        {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {t("liquidity.approve")}
                      </button>
                      <button onClick={() => void decide(r.id, "REJECTED")} disabled={busyId === r.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50">
                        <X className="w-3.5 h-3.5" />
                        {t("liquidity.reject")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        !error && <LoadingRows rows={6} />
      )}
    </div>
  );
}
