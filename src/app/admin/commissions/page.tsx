"use client";

import React, { useEffect, useState } from "react";
import { PageHeader, fmtMoney, fmtDate, TextCell } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { adminApiFetch } from "@/lib/admin/adminSession";
import { StatsFromRows } from "@/components/admin/AdminPageUI";

/**
 * Commission sets — the platform-wide fee & commission schedule
 * (agent_commission_rates) and what it has actually paid out, rolled up per
 * aggregator and per regional manager territory.
 *
 * The rate rows are exactly what the commission engine reads when pricing
 * any agency transaction (lib/agency/commissionPricing: within a
 * transaction type + currency, the band with the highest min_amount at or
 * below the amount wins, and the amount must fit max_amount). One schedule
 * applies to every aggregator and every territory — there are no
 * per-aggregator overrides, and this page never implies otherwise.
 */

type Bucket = { earned: number; settled: number; count: number };

interface OverviewData {
  totals: Record<string, Bucket>;
  currencies: string[];
  byAggregator: {
    aggregatorId: string;
    code: string;
    businessName: string;
    country: string;
    status: string;
    territories: { name: string; stateOrRegion: string }[];
    agentCount: number;
    byCurrency: Record<string, Bucket>;
    lastEarnedAt: string | null;
  }[];
  byRegionalManager: {
    managerId: string;
    name: string;
    country: string;
    status: string;
    territories: string[];
    aggregatorCount: number;
    agentCount: number;
    byCurrency: Record<string, Bucket>;
    lastEarnedAt: string | null;
  }[];
  ratesNote: string;
}

const TX_TYPES = ["CASH_IN", "CASH_OUT", "TRANSFER_NIP", "TRANSFER_CROSS_BORDER"];

function bandLabel(row: Record<string, any>): string {
  const min = Number(row.min_amount ?? 0);
  const max = row.max_amount === null || row.max_amount === undefined ? null : Number(row.max_amount);
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return max === null ? `${fmt(min)} and above` : `${fmt(min)} – ${fmt(max)}`;
}

function feeLabel(flat: unknown, bps: unknown): string {
  const f = Number(flat ?? 0);
  const b = Number(bps ?? 0);
  const parts: string[] = [];
  if (f !== 0) parts.push(`flat ${f.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  if (b !== 0) parts.push(`${b.toLocaleString()} bps`);
  return parts.length ? parts.join(" + ") : "no fee";
}

export default function CommissionsPage() {
  const [tab, setTab] = useState<"sets" | "aggregators" | "managers" | "history">("sets");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "aggregators" && tab !== "managers") return;
    let cancelled = false;
    (async () => {
      setOverviewError(null);
      try {
        const res = await adminApiFetch("/api/admin/commissions/overview");
        const json = await res.json();
        if (!res.ok || json.status !== "ok") {
          if (!cancelled) setOverviewError(json?.error?.message || "COMMISSION_OVERVIEW_FAILED");
        } else if (!cancelled) {
          setOverview(json as OverviewData);
        }
      } catch {
        if (!cancelled) setOverviewError("ADMIN_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const rateCols: ResourceColumn[] = [
    {
      key: "transaction_type",
      label: "Type",
      render: (r) => (
        <span className="font-bold text-[var(--foreground)]">
          {TX_TYPES.includes(String(r.transaction_type)) ? String(r.transaction_type).replace(/_/g, " ") : String(r.transaction_type ?? "—")}
        </span>
      ),
    },
    { key: "currency", label: "Currency" },
    { key: "min_amount", label: "Amount band", render: (r) => <span className="font-mono text-[12px]">{bandLabel(r)}</span> },
    { key: "customer_fee_flat", label: "Customer fee", render: (r) => <span className="text-[var(--foreground-muted)]">{feeLabel(r.customer_fee_flat, r.customer_fee_bps)}</span> },
    { key: "agent_commission_flat", label: "Agent commission", render: (r) => <span className="font-bold text-[var(--foreground)]">{feeLabel(r.agent_commission_flat, r.agent_commission_bps)}</span> },
    { key: "is_active", label: "Active", render: (r) => <StatusChip value={r.is_active === true ? "ACTIVE" : "INACTIVE"} /> },
    { key: "created_at", label: "Set on", hideOnMobile: true, render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
  ];

  const historyCols: ResourceColumn[] = [
    { key: "changed_at", label: "Changed", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.changed_at)}</span> },
    { key: "rate_id", label: "Rate row", render: (r) => <span className="font-mono text-[12px]">{r.rate_id ? String(r.rate_id).slice(0, 8) + "…" : "—"}</span> },
    { key: "old_values", label: "Old values", render: (r) => <TextCell value={JSON.stringify(r.old_values ?? {})} /> },
    { key: "new_values", label: "New values", render: (r) => <TextCell value={JSON.stringify(r.new_values ?? {})} /> },
    { key: "changed_by", label: "Changed by", render: (r) => <span className="font-mono text-[12px]">{r.changed_by ? String(r.changed_by).slice(0, 8) + "…" : "—"}</span> },
  ];

  const bucketLine = (b: Bucket, cur: string) => (
    <span>
      earned <b className="text-[var(--foreground)]">{fmtMoney(b.earned, cur)}</b> · settled {fmtMoney(b.settled, cur)} · {b.count}×
    </span>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Agency & Merchants"
        title="Commission Sets"
        subtitle="The platform-wide fee & commission schedule the agency engine prices every transaction with — and what it has paid out, per aggregator and per regional manager territory. One schedule applies to every aggregator; there are no per-aggregator overrides."
      />

      {tab === "sets" && (
        <StatsFromRows
          rows={rows}
          contextLabel="rate rows (current filter)"
          stats={[
            { label: "Rate rows", compute: (r) => String(r.length) },
            { label: "Active", compute: (r) => String(r.filter((x) => x.is_active === true).length) },
            { label: "Currencies", compute: (r) => String(new Set(r.map((x) => x.currency)).size) },
            { label: "Transaction types", compute: (r) => String(new Set(r.map((x) => x.transaction_type)).size) },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {([
          ["sets", "Commission sets"],
          ["aggregators", "By aggregator"],
          ["managers", "By regional manager"],
          ["history", "Change history"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key as typeof tab);
              setRows([]);
            }}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === key ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sets" && (
        <ResourceTable
          resource="agent-commission-rates"
          columns={rateCols}
          exportName="commission-sets"
          searchPlaceholder="Search type or currency…"
          filters={[
            { key: "transaction_type", label: "Type", options: TX_TYPES },
            { key: "currency", label: "Currency", options: ["NGN", "XOF"] },
            { key: "is_active", label: "Active", options: ["true", "false"] },
          ]}
          emptyMessage="No commission rate rows match — the engine has no schedule for this filter."
          onRowsLoaded={setRows}
        />
      )}

      {tab === "aggregators" && (
        <section className="space-y-3">
          {overviewError && <div className="p-4 rounded-2xl bg-[var(--surface)] border border-red-500/30 text-sm text-red-400">{overviewError}</div>}
          {!overview && !overviewError && <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">Loading commission rollups…</div>}
          {overview && overview.byAggregator.length === 0 && (
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">
              No aggregators registered. Commission sets apply to aggregator networks; with none onboarded there is nothing to roll up.
            </div>
          )}
          {overview?.byAggregator.map((agg) => (
            <div key={agg.aggregatorId} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    {agg.businessName} <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{agg.code}</span>
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    {agg.territories.length} territory · {agg.agentCount} agent{agg.agentCount === 1 ? "" : "s"} · {agg.country}
                  </div>
                </div>
                <StatusChip value={agg.status} />
              </div>
              <div className="text-xs text-[var(--foreground-muted)] space-y-0.5">
                {agg.territories.map((t) => (
                  <div key={t.name}>{t.name} — {t.stateOrRegion}</div>
                ))}
              </div>
              <div className="text-xs space-y-1 pt-1 border-t border-[var(--border)]">
                {Object.keys(agg.byCurrency).length === 0 ? (
                  <span className="text-[var(--foreground-muted)]">No commissions earned under the current sets yet.</span>
                ) : (
                  Object.entries(agg.byCurrency).map(([cur, b]) => (
                    <div key={cur} className="flex justify-between">
                      <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{cur}</span>
                      {bucketLine(b, cur)}
                    </div>
                  ))
                )}
                <div className="text-[11px] text-[var(--foreground-muted)]">Last earned: {agg.lastEarnedAt ? fmtDate(agg.lastEarnedAt) : "never"}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "managers" && (
        <section className="space-y-3">
          {overviewError && <div className="p-4 rounded-2xl bg-[var(--surface)] border border-red-500/30 text-sm text-red-400">{overviewError}</div>}
          {!overview && !overviewError && <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">Loading commission rollups…</div>}
          {overview && overview.byRegionalManager.length === 0 && (
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">
              No regional managers registered.
            </div>
          )}
          {overview?.byRegionalManager.map((mgr) => (
            <div key={mgr.managerId} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[var(--foreground)]">{mgr.name}</div>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    {mgr.country} · {mgr.territories.join(", ") || "no territories"} · {mgr.aggregatorCount} aggregator{mgr.aggregatorCount === 1 ? "" : "s"} · {mgr.agentCount} agent{mgr.agentCount === 1 ? "" : "s"}
                  </div>
                </div>
                <StatusChip value={mgr.status} />
              </div>
              <div className="text-xs space-y-1 pt-1 border-t border-[var(--border)]">
                {Object.keys(mgr.byCurrency).length === 0 ? (
                  <span className="text-[var(--foreground-muted)]">
                    {mgr.aggregatorCount === 0 ? "No aggregator territories in this manager's region — nothing to earn yet." : "No commissions earned in this region under the current sets yet."}
                  </span>
                ) : (
                  Object.entries(mgr.byCurrency).map(([cur, b]) => (
                    <div key={cur} className="flex justify-between">
                      <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{cur}</span>
                      {bucketLine(b, cur)}
                    </div>
                  ))
                )}
                <div className="text-[11px] text-[var(--foreground-muted)]">Last earned: {mgr.lastEarnedAt ? fmtDate(mgr.lastEarnedAt) : "never"}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "history" && (
        <ResourceTable
          resource="agent-commission-rate-history"
          columns={historyCols}
          exportName="commission-rate-history"
          searchPlaceholder=""
          emptyMessage="No rate changes recorded yet — the audit trail starts when the first audited rate edit happens."
        />
      )}
    </div>
  );
}
