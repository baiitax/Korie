"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill, Pagination, statusPillKind, StatCard } from "@/components/regional/ui";
import { ArrowRightLeft, CheckCircle2, XCircle } from "lucide-react";

interface TxRow {
  id: string;
  reference: string;
  agent: { code: string; name: string; state: string } | null;
  type: string;
  amount: number;
  customerFee: number | null;
  agentCommission: number | null;
  currency: string;
  status: string;
  failureReason: string | null;
  customer: { name: string; phone: string } | null;
  createdAt: string;
}

export default function RegionalTransactionsPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [rows, setRows] = useState<TxRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<{ byStatus: Record<string, number>; byCurrency: Record<string, { count: number; volume: number }> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCurrency, setFCurrency] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (q.trim()) params.set("q", q.trim());
      if (fType) params.set("type", fType);
      if (fStatus) params.set("status", fStatus);
      if (fCurrency) params.set("currency", fCurrency);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await regionalApiFetch(`/api/regional/transactions?${params}`);
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message || "TX_FAILED");
      else {
        setRows(json.data.items);
        setTotal(json.data.total);
        setPageCount(json.data.pageCount);
        setSummary(json.data.summary);
      }
    } catch {
      setError("REGIONAL_SESSION_UNAVAILABLE");
    }
  }, [page, q, fType, fStatus, fCurrency, from, to]);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader title={t("transactions.title")} subtitle={t("transactions.subtitle")} onRefresh={load} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowRightLeft} label={t("common.total", { count: total })} value={String(total)} />
        {summary &&
          Object.entries(summary.byCurrency).slice(0, 2).map(([cur, v]) => (
            <StatCard key={cur} icon={CheckCircle2} label={`${cur} · ${t("performance.volume")}`} value={formatCurrency(v.volume, cur)} hint={`${v.count} ${t("dashboard.txns")}`} />
          ))}
        {summary && (
          <StatCard
            icon={XCircle}
            label={t("dashboard.healthTx")}
            value={`${((summary.byStatus.SUCCESSFUL || 0) / Math.max(1, Object.values(summary.byStatus).reduce((s, n) => s + n, 0)) * 100).toFixed(1)}%`}
            hint={Object.entries(summary.byStatus).slice(0, 3).map(([s, n]) => `${s}:${n}`).join(" · ")}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Ref…" className="flex-1 min-w-[140px] sm:max-w-[200px] px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
        <select value={fType} onChange={(e) => { setPage(1); setFType(e.target.value); }} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="">{t("transactions.filterType")}: {t("common.all")}</option>
          {["CASH_IN", "CASH_OUT", "BILL_PAYMENT", "AIRTIME", "TRANSFER"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => { setPage(1); setFStatus(e.target.value); }} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="">{t("transactions.filterStatus")}: {t("common.all")}</option>
          {["INITIATED", "PENDING", "PROCESSING", "SUCCESSFUL", "FAILED", "REVERSED", "CANCELLED", "DISPUTED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fCurrency} onChange={(e) => { setPage(1); setFCurrency(e.target.value); }} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
          <option value="">{t("common.currency")}: {t("common.all")}</option>
          {["XOF", "NGN"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" aria-label={t("common.from")} />
        <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" aria-label={t("common.to")} />
      </div>
      <p className="text-[11px] text-[var(--foreground-muted)]">🔒 {t("transactions.readOnlyNote")}</p>

      {error && <ErrorNote message={error} onRetry={load} />}
      {rows === null && !error ? (
        <LoadingRows />
      ) : rows && rows.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title={t("transactions.empty_transactions")} />
      ) : rows ? (
        <>
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-semibold">{t("transactions.col.reference")}</th>
                  <th className="px-4 py-3 font-semibold">{t("transactions.col.agent")}</th>
                  <th className="px-4 py-3 font-semibold">{t("transactions.col.type")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("transactions.col.amount")}</th>
                  <th className="px-4 py-3 font-semibold">{t("transactions.col.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("transactions.col.customer")}</th>
                  <th className="px-4 py-3 font-semibold">{t("transactions.col.when")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--border)] hover:bg-[var(--surface)]/60">
                    <td className="px-4 py-3 font-mono text-xs">{r.reference}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.agent ? <><div className="font-semibold">{r.agent.name}</div><div className="font-mono text-[10px] text-[var(--foreground-muted)]">{r.agent.code}</div></> : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{r.type}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{formatCurrency(r.amount, r.currency)}</td>
                    <td className="px-4 py-3"><Pill kind={statusPillKind(r.status)}>{r.status}</Pill></td>
                    <td className="px-4 py-3 text-xs text-[var(--foreground-muted)]">{r.customer ? `${r.customer.name} · ${r.customer.phone}` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold truncate">{r.reference}</div>
                    <div className="text-[11px] text-[var(--foreground-muted)]">{r.agent?.code} · {r.type} · {formatDate(r.createdAt)}</div>
                  </div>
                  <Pill kind={statusPillKind(r.status)}>{r.status}</Pill>
                </div>
                <div className="mt-1.5 text-sm font-bold font-mono">{formatCurrency(r.amount, r.currency)}</div>
                {r.customer && <div className="text-[11px] text-[var(--foreground-muted)]">{r.customer.name} · {r.customer.phone}</div>}
              </div>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
}
