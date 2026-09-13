"use client";

import React, { useMemo, useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import { BarChart3, TrendingUp, Coins, Users, Store, Inbox } from "lucide-react";

const RANGE_DAYS: Record<string, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };

export default function AggregatorAnalyticsPage() {
  const { aggregator, agents, merchants, territories, transactions, commissions, formatCurrency, formatDate, t } = useAggregator();
  const [timeRange, setTimeRange] = useState("30D");

  const days = RANGE_DAYS[timeRange] ?? 30;
  const since = Date.now() - days * 86400_000;

  /* Everything below is computed from the real network rows the context
   * loaded from /api/v1/aggregator/* — no figures are hardcoded. */
  const windowTx = useMemo(
    () => transactions.filter((tx) => {
      if (tx.status !== "SUCCESSFUL") return false;
      return new Date(tx.createdAt).getTime() >= since;
    }),
    [transactions, since],
  );

  const volumeByCurrency = useMemo(() => {
    const out: Record<string, number> = {};
    windowTx.forEach((tx) => {
      const cur = tx.currency || "NGN";
      out[cur] = (out[cur] || 0) + tx.amount;
    });
    return out;
  }, [windowTx]);

  const successRate = useMemo(() => {
    const all = transactions.filter((tx) => new Date(tx.createdAt).getTime() >= since);
    if (all.length === 0) return null;
    const ok = all.filter((tx) => tx.status === "SUCCESSFUL").length;
    return ok / all.length;
  }, [transactions, since]);

  /* Commission earned inside the window (settled + pending), per currency —
   * falls back to the commission summary when rows carry no date. */
  const commissionByCurrency = useMemo(() => {
    const out: Record<string, number> = {};
    windowTx.forEach((tx) => {
      const cur = tx.currency || "NGN";
      out[cur] = (out[cur] || 0) + (tx.aggregatorCommission || 0);
    });
    return out;
  }, [windowTx]);

  const activeAgents = agents.filter((a) => a.status === "ACTIVE").length;
  const activeMerchants = merchants.filter((m) => m.status === "ACTIVE").length;
  const hasData = transactions.length > 0 || agents.length > 0 || merchants.length > 0;

  const currencyList = Object.keys(volumeByCurrency).length > 0 ? Object.keys(volumeByCurrency) : [aggregator.currency || "NGN"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Network Financial Analytics</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Network volume, commission and node productivity — computed live from your real network activity
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] text-xs font-mono">
          {["7D", "30D", "90D", "1Y"].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-xl font-bold transition-colors ${timeRange === r ? "bg-teal-500 text-slate-950" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — real aggregates only, never combined across currencies */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Gross Volume ({timeRange})</div>
          {Object.keys(volumeByCurrency).length === 0 ? (
            <div className="text-2xl font-black font-mono text-[var(--foreground)]">—</div>
          ) : (
            Object.entries(volumeByCurrency).map(([cur, v]) => (
              <div key={cur} className="text-2xl font-black font-mono text-[var(--foreground)]">
                {formatCurrency(v, cur as any)}
                <span className="text-[10px] text-[var(--foreground-muted)] ml-1">{cur}</span>
              </div>
            ))
          )}
          <div className="text-[10px] text-[var(--foreground-muted)] font-mono">{windowTx.length} successful transactions</div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Network Transactions</div>
          <div className="text-2xl font-black font-mono text-[var(--foreground)]">{windowTx.length}</div>
          <div className="text-[10px] text-teal-600 dark:text-teal-300 font-mono">
            {successRate !== null ? `${(successRate * 100).toFixed(1)}% Success Rate` : "No transactions in window"}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Aggregator Commission ({timeRange})</div>
          {Object.values(commissionByCurrency).every((v) => v === 0) ? (
            <>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{formatCurrency(0)}</div>
              <div className="text-[10px] text-[var(--foreground-muted)] font-mono">No commission-bearing activity in window</div>
            </>
          ) : (
            Object.entries(commissionByCurrency).map(([cur, v]) => (
              <div key={cur} className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(v, cur as any)}
                <span className="text-[10px] text-[var(--foreground-muted)] ml-1">{cur}</span>
              </div>
            ))
          )}
          <div className="text-[10px] text-[var(--foreground-muted)] font-mono">Pending clearance: {formatCurrency(commissions.pendingClearance)}</div>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Active Network Nodes</div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{activeAgents + activeMerchants} Nodes</div>
          <div className="text-[10px] text-[var(--foreground-muted)]">
            {activeAgents} Agents • {activeMerchants} Merchants
          </div>
        </div>
      </div>

      {/* Territory Analytics — real per-territory rows from the territories API */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-5">
        <div>
          <h3 className="font-bold text-[var(--foreground)] text-base">Geographical Territory Contribution</h3>
          <p className="text-xs text-[var(--foreground-muted)]">Comparative activity by geographical territory (today)</p>
        </div>

        {territories.length === 0 ? (
          <div className="py-10 text-center">
            <Inbox className="w-8 h-8 mx-auto text-[var(--foreground-muted)] mb-3" />
            <div className="text-sm font-bold text-[var(--foreground)]">No territories registered yet</div>
            <p className="text-xs text-[var(--foreground-muted)] mt-1 max-w-md mx-auto">
              Territories appear here as you register them in the Territories console.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {territories.map((t) => {
              const maxTPV = Math.max(1, ...territories.map((x) => x.todayTPV));
              const share = (t.todayTPV / maxTPV) * 100;
              return (
                <div key={t.id} className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-[var(--foreground)] text-sm">{t.name}</div>
                      <div className="text-[11px] text-[var(--foreground-muted)]">
                        {t.stateOrRegion} • {t.activeAgentsCount} Agents • {t.activeMerchantsCount} Merchants
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(t.todayTPV)}
                      </div>
                      <div className="text-[10px] text-amber-300 font-mono">
                        Commission: {formatCurrency(t.aggregatorCommissionToday)}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500/70" style={{ width: `${Math.max(2, share)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
