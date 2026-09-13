"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
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

function statusPill(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    PENDING: "bg-amber-500/10 text-amber-500",
    SUSPENDED: "bg-rose-500/10 text-rose-500",
    INACTIVE: "bg-slate-500/10 text-slate-400",
  };
  return map[status] || "bg-slate-500/10 text-slate-400";
}

export default function RegionalAgentsPage() {
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [rows, setRows] = useState<AgentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/agents");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "AGENTS_FAILED");
        else if (!cancelled) setRows(json.payload.agents);
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
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.stateOrRegion.toLowerCase().includes(q) ||
        (r.aggregator || "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (managerError) {
    return (
      <div className="p-6 sm:p-8">
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--muted)]">{t("session.error")}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("agents.title")}</h1>
        <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">{t("agents.subtitle")}</p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("common.search")}
        className="w-full sm:max-w-sm px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
      />

      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500">{error}</div>}

      {rows === null && !error ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : rows && rows.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
          <Users className="w-8 h-8 mx-auto text-[var(--muted)] mb-3" />
          <div className="text-sm font-semibold">{t("agents.empty")}</div>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">{t("agents.emptyBody")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--muted)]">
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
                <tr key={r.id} className="border-t border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface)]/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-[11px] font-mono text-[var(--muted)]">{r.code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.stateOrRegion}</div>
                    {r.cityOrLga && <div className="text-[11px] text-[var(--muted)]">{r.cityOrLga}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)] max-w-[220px] truncate">{r.aggregator || t("common.none")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPill(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.kycStatus === "VERIFIED" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "bg-amber-500/10 text-amber-500"}`}>
                      {r.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                    {Object.entries(r.floatByCurrency).length === 0
                      ? "—"
                      : Object.entries(r.floatByCurrency)
                          .map(([cur, v]) => formatCurrency(v, cur))
                          .join(" · ")}
                  </td>
                  <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                    {r.transactions.count === 0 ? (
                      <span className="text-[var(--muted)]">{t("agents.neverTransacted")}</span>
                    ) : (
                      <>
                        <div className="font-mono font-semibold">{formatCurrency(r.transactions.volume, r.transactions.currency)}</div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {t("agents.txCount", { count: r.transactions.count })} · {formatDate(r.transactions.lastAt)}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
