"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill } from "@/components/regional/ui";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";

const DATASETS = ["aggregator_performance", "agent_network", "transactions", "liquidity", "commissions"] as const;

export default function RegionalReportsPage() {
  const { t, formatDate, manager, managerError } = useRegional();
  const [dataset, setDataset] = useState<string>("aggregator_performance");
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; dataset: string; params: any; rowCount: number; status: string; createdAt: string }[] | null>(null);
  const [rate, setRate] = useState<{ usedLastHour: number; maxPerHour: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await regionalApiFetch("/api/regional/reports");
      const json = await res.json();
      if (res.ok) {
        setHistory(json.data.exports);
        setRate(json.data.rateLimit);
      }
    } catch {
      /* history is best-effort */
    }
  }, []);

  useEffect(() => {
    if (manager) void load();
  }, [manager, load]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await regionalApiFetch("/api/regional/reports/export", {
        method: "POST",
        body: JSON.stringify({ dataset, from, to: new Date(to + "T23:59:59").toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "EXPORT_FAILED");
      } else {
        const blob = new Blob([json.data.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = json.data.filename;
        a.click();
        URL.revokeObjectURL(url);
        setNotice(t("reports.downloaded") + " — " + t("reports.rows", { count: json.data.rowCount }));
        await load();
      }
    } catch {
      setError(t("reports.failed"));
    } finally {
      setBusy(false);
    }
  };

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")} />

      {error && <ErrorNote message={error} />}
      {notice && <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-primary)]/10 text-sm text-[var(--brand-primary)]">{notice}</div>}

      <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-semibold space-y-1.5">
            <span>{t("reports.dataset")}</span>
            <select value={dataset} onChange={(e) => setDataset(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm">
              {DATASETS.map((d) => <option key={d} value={d}>{t(`reports.datasets.${d}`)}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold space-y-1.5">
            <span>{t("common.from")}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" />
          </label>
          <label className="text-xs font-semibold space-y-1.5">
            <span>{t("common.to")}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-sm" />
          </label>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => void generate()} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--brand-primary)] text-[var(--brand-on-primary,#052e2b)] disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {busy ? t("common.exporting") : t("reports.generate")}
          </button>
          {rate && <Pill kind={rate.usedLastHour >= rate.maxPerHour ? "bad" : "muted"}>{t("reports.rateLimit", { used: rate.usedLastHour, max: rate.maxPerHour })}</Pill>}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("reports.history")}</h2>
        {history === null ? (
          <LoadingRows rows={3} />
        ) : history.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title={t("reports.empty")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-semibold">{t("reports.dataset")}</th>
                  <th className="px-4 py-3 font-semibold">{t("reports.range")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("performance.count")}</th>
                  <th className="px-4 py-3 font-semibold">{t("common.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("support.col.created")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 text-xs font-semibold">{t(`reports.datasets.${h.dataset}`)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] font-mono">{String(h.params?.from || "").slice(0, 10)} → {String(h.params?.to || "").slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{h.rowCount}</td>
                    <td className="px-4 py-3"><Pill kind={h.status === "GENERATED" ? "ok" : "bad"}>{h.status}</Pill></td>
                    <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] whitespace-nowrap">{formatDate(h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
