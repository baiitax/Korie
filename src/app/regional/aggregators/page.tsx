"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill, Pagination, statusPillKind } from "@/components/regional/ui";
import { Building2, ChevronRight } from "lucide-react";

interface AggRow {
  id: string;
  code: string;
  name: string;
  status: string;
  kyb: string;
  tier: string;
  regions: string[];
  agents: { total: number; active: number };
  volumeByCurrency: Record<string, { count: number; volume: number }>;
  commissionByCurrency: Record<string, { earned: number; settled: number }>;
  openAlerts: number;
  createdAt: string;
}

export default function RegionalAggregatorsPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [rows, setRows] = useState<AggRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "10", sort });
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const res = await regionalApiFetch(`/api/regional/aggregators?${params}`);
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message || "AGGREGATORS_FAILED");
      else {
        setRows(json.data.items);
        setTotal(json.data.total);
        setPageCount(json.data.pageCount);
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    }
  }, [page, q, status, sort]);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader title={t("aggregators.title")} subtitle={t("aggregators.subtitle")} onRefresh={load} />

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder={t("aggregators.searchPh")}
          className="flex-1 min-w-[180px] sm:max-w-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
        />
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {["ACTIVE", "PENDING", "REVIEW", "SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="name">A–Z</option>
          <option value="volume">{t("dashboard.volume30d")}</option>
          <option value="agents">{t("dashboard.agents")}</option>
        </select>
      </div>

      {error && <ErrorNote message={error} onRetry={load} />}
      {rows === null && !error ? (
        <LoadingRows />
      ) : rows && rows.length === 0 ? (
        <EmptyState icon={Building2} title={t("dashboard.noAggregators")} body={t("dashboard.noAggregatorsBody")} />
      ) : rows ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-semibold">{t("aggregators.col.aggregator")}</th>
                  <th className="px-4 py-3 font-semibold">{t("aggregators.col.regions")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("aggregators.col.agents")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("aggregators.col.volume")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("aggregators.col.commission")}</th>
                  <th className="px-4 py-3 font-semibold text-center">{t("aggregators.col.risk")}</th>
                  <th className="px-4 py-3 font-semibold">{t("aggregators.col.status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--border)] hover:bg-[var(--surface)]/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{r.code} · {r.tier}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.regions.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold">{r.agents.total}</div>
                      <div className="text-[10px] text-[var(--brand-primary)]">{r.agents.active} {t("dashboard.aggActive")}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {Object.keys(r.volumeByCurrency).length === 0
                        ? "—"
                        : Object.entries(r.volumeByCurrency).map(([cur, v]) => (
                            <div key={cur}>{formatCurrency(v.volume, cur)} <span className="text-[var(--foreground-muted)]">({v.count})</span></div>
                          ))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {Object.keys(r.commissionByCurrency).length === 0
                        ? "—"
                        : Object.entries(r.commissionByCurrency).map(([cur, v]) => (
                            <div key={cur}>{formatCurrency(v.earned + v.settled, cur)}</div>
                          ))}
                    </td>
                    <td className="px-4 py-3 text-center">{r.openAlerts > 0 ? <Pill kind="warn">{r.openAlerts}</Pill> : <span className="text-[var(--foreground-muted)]">—</span>}</td>
                    <td className="px-4 py-3"><Pill kind={statusPillKind(r.status)}>{r.status}</Pill></td>
                    <td className="px-4 py-3">
                      <Link href={`/regional/aggregators/${r.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline whitespace-nowrap">
                        {t("aggregators.open360")} <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
          <div className="text-[10px] text-[var(--foreground-muted)]">{formatDate(rows[0]?.createdAt)} — {t("common.poweredBy")}</div>
        </>
      ) : null}
    </div>
  );
}
