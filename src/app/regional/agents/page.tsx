"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill, statusPillKind } from "@/components/regional/ui";
import { Users } from "lucide-react";

interface AgentRow {
  id: string;
  code: string;
  name: string;
  businessName: string | null;
  stateOrRegion: string;
  cityOrLga: string | null;
  status: string;
  kycStatus: string;
  tier: string | null;
  aggregator: string | null;
  floatByCurrency: Record<string, number>;
  transactions: { count: number; volume: number; currency: string; lastAt: string | null };
  registeredAt: string;
}

function activityOf(lastAt: string | null): string {
  if (!lastAt) return "NO_ACTIVITY";
  const days = (Date.now() - new Date(lastAt).getTime()) / 86400_000;
  if (days <= 7) return "ACTIVE";
  if (days <= 30) return "LOW_ACTIVITY";
  return "DORMANT";
}

export default function RegionalAgentsPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [rows, setRows] = useState<AgentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fKyc, setFKyc] = useState("");
  const [fActivity, setFActivity] = useState("");

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/agents");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "AGENTS_FAILED");
        else if (!cancelled) setRows(json.data.agents);
      } catch {
        setError("REGIONAL_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q) && !r.stateOrRegion.toLowerCase().includes(q) && !(r.aggregator || "").toLowerCase().includes(q)) return false;
      if (fStatus && r.status !== fStatus) return false;
      if (fKyc && r.kycStatus !== fKyc) return false;
      if (fActivity && activityOf(r.transactions.lastAt) !== fActivity) return false;
      return true;
    });
  }, [rows, query, fStatus, fKyc, fActivity]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader title={t("agents.title")} subtitle={t("agents.subtitle")} />

      <div className="flex flex-wrap gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("common.search")} className="flex-1 min-w-[160px] sm:max-w-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="">{t("agents.filterStatus")}: {t("common.all")}</option>
          {["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fKyc} onChange={(e) => setFKyc(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="">{t("agents.filterKyc")}: {t("common.all")}</option>
          {["VERIFIED", "PENDING", "REJECTED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fActivity} onChange={(e) => setFActivity(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="">{t("agents.filterActivity")}: {t("common.all")}</option>
          {["ACTIVE", "LOW_ACTIVITY", "DORMANT", "NO_ACTIVITY"].map((s) => <option key={s} value={s}>{t("agents.activity_" + s)}</option>)}
        </select>
      </div>

      {error && <ErrorNote message={error} />}
      {rows === null && !error ? (
        <LoadingRows />
      ) : rows && rows.length === 0 ? (
        <EmptyState icon={Users} title={t("agents.empty")} body={t("agents.emptyBody")} />
      ) : (
        <>
          {/* Card layout on mobile, table on desktop */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-semibold">{t("agents.col.agent")}</th>
                  <th className="px-4 py-3 font-semibold">{t("agents.col.state")}</th>
                  <th className="px-4 py-3 font-semibold">{t("agents.col.aggregator")}</th>
                  <th className="px-4 py-3 font-semibold">{t("agents.col.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("agents.col.kyc")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("agents.col.float")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("agents.col.activity")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--border)] hover:bg-[var(--surface)]/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{r.code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.stateOrRegion}</div>
                      {r.cityOrLga && <div className="text-[11px] text-[var(--foreground-muted)]">{r.cityOrLga}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] max-w-[220px] truncate">{r.aggregator || t("common.none")}</td>
                    <td className="px-4 py-3"><Pill kind={statusPillKind(r.status)}>{r.status}</Pill></td>
                    <td className="px-4 py-3"><Pill kind={r.kycStatus === "VERIFIED" ? "ok" : "warn"}>{r.kycStatus}</Pill></td>
                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {Object.entries(r.floatByCurrency).length === 0 ? "—" : Object.entries(r.floatByCurrency).map(([cur, v]) => formatCurrency(v, cur)).join(" · ")}
                    </td>
                    <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                      {r.transactions.count === 0 ? (
                        <span className="text-[var(--foreground-muted)]">{t("agents.neverTransacted")}</span>
                      ) : (
                        <>
                          <div className="font-mono font-semibold">{formatCurrency(r.transactions.volume, r.transactions.currency)}</div>
                          <div className="text-[10px] text-[var(--foreground-muted)]">{t("agents.txCount", { count: r.transactions.count })} · {formatDate(r.transactions.lastAt)}</div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{r.name}</div>
                    <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{r.code} · {r.stateOrRegion}</div>
                  </div>
                  <Pill kind={statusPillKind(r.status)}>{r.status}</Pill>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-[var(--foreground-muted)]">{t("agents.col.float")}: </span><b className="font-mono">{Object.entries(r.floatByCurrency).length === 0 ? "—" : Object.entries(r.floatByCurrency).map(([cur, v]) => formatCurrency(v, cur)).join(" · ")}</b></div>
                  <div><span className="text-[var(--foreground-muted)]">{t("agents.col.activity")}: </span><b>{r.transactions.count > 0 ? formatCurrency(r.transactions.volume, r.transactions.currency) : t("agents.neverTransacted")}</b></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
