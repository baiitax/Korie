"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader, fmtMoney, fmtDate, fmtAgo } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { adminApiFetch } from "@/lib/admin/adminSession";

/**
 * FX desk — three live views plus the governed rate editor.
 *
 * Reference rates (fx_rates), executed conversions (liquidity.fx), treasury
 * FX exposure — all read live from the database. Rate changes go through
 * update_fx_rate_pair (migration 20260914000053): attributed, sourced,
 * history-snapshotted, and reciprocal by construction (the reverse rate is
 * auto-derived as 1/rate, so no unbooked spread can be introduced — F18).
 */
export default function FxPage() {
  const rateCols: ResourceColumn[] = [
    { key: "source_currency", label: "Pair", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.source_currency} → {r.destination_currency}</span> },
    { key: "rate", label: "Rate", className: "text-right", render: (r) => <span className="font-bold text-[var(--brand-primary)]">{typeof r.rate === "number" ? r.rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span> },
    { key: "source", label: "Source" },
    { key: "updated_by", label: "Updated by", hideOnMobile: true },
    { key: "updated_at", label: "Last update", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtAgo(r.updated_at)}</span> },
  ];

  const historyCols: ResourceColumn[] = [
    { key: "changed_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.changed_at)}</span> },
    { key: "source_currency", label: "Pair", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.source_currency} → {r.destination_currency}</span> },
    { key: "old_rate", label: "Old", className: "text-right", render: (r) => <span className="text-rose-400">{typeof r.old_rate === "number" ? r.old_rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span> },
    { key: "new_rate", label: "New", className: "text-right", render: (r) => <span className="text-emerald-400">{typeof r.new_rate === "number" ? r.new_rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span> },
    { key: "changed_by", label: "Changed by", hideOnMobile: true },
  ];

  const txCols: ResourceColumn[] = [
    { key: "created_at", label: "When", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "fx_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.fx_reference}</span> },
    { key: "source_currency", label: "Leg", render: (r) => <span>{fmtMoney(r.source_amount, r.source_currency)} → {fmtMoney(r.target_amount, r.target_currency)}</span> },
    { key: "exchange_rate", label: "Rate", className: "text-right", render: (r) => <span>{typeof r.exchange_rate === "number" ? r.exchange_rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</span> },
    { key: "approved_by", label: "Approved by", hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
  ];

  const posCols: ResourceColumn[] = [
    { key: "currency_pair", label: "Pair", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.currency_pair}</span> },
    { key: "quote_currency", label: "Quote ccy" },
    { key: "net_exposure_base_minor", label: "Net exposure", className: "text-right", render: (r) => <span className="font-bold">{typeof r.net_exposure_base_minor === "number" ? (r.net_exposure_base_minor / 100).toLocaleString() : "—"}</span> },
    { key: "average_acquisition_rate", label: "Avg acq. rate", hideOnMobile: true, className: "text-right" },
    { key: "current_reference_rate", label: "Ref. rate", hideOnMobile: true, className: "text-right" },
    { key: "unrealized_pnl_minor", label: "Unrealized P&L", className: "text-right", render: (r) => <span className={Number(r.unrealized_pnl_minor) >= 0 ? "text-emerald-400" : "text-rose-400"}>{typeof r.unrealized_pnl_minor === "number" ? (r.unrealized_pnl_minor / 100).toLocaleString() : "—"}</span> },
  ];

  // ---- Governed rate editor state ----
  const [rates, setRates] = useState<{ source_currency: string; destination_currency: string; rate: number; source: string | null }[] | null>(null);
  const [pair, setPair] = useState<string>("");
  const [newRate, setNewRate] = useState("");
  const [rateSource, setRateSource] = useState("");
  const [rateNotes, setRateNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateFlash, setRateFlash] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    try {
      const res = await adminApiFetch("/api/admin/fx/rates");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The rate list failed to load.");
      setRates(json.rates ?? []);
      setPair((p) => p || (json.rates?.length ? `${json.rates[0].source_currency}->${json.rates[0].destination_currency}` : ""));
    } catch (e) {
      setRateError(e instanceof Error ? e.message : "The rate list failed to load.");
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const selected = rates?.find((r) => `${r.source_currency}->${r.destination_currency}` === pair);
  const reverse = rates?.find((r) => r.source_currency === selected?.destination_currency && r.destination_currency === selected?.source_currency);
  const previewReverse = Number(newRate) > 0 ? (1 / Number(newRate)).toFixed(6) : "—";

  const submitRate = async () => {
    if (!selected) return;
    setSaving(true);
    setRateError(null);
    setRateFlash(null);
    try {
      const res = await adminApiFetch("/api/admin/fx/rates", {
        method: "POST",
        body: JSON.stringify({
          source_currency: selected.source_currency,
          destination_currency: selected.destination_currency,
          new_rate: Number(newRate),
          rate_source: rateSource,
          notes: rateNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The rate change did not complete.");
      setRateFlash(
        `${selected.source_currency}→${selected.destination_currency} set to ${Number(json.result?.forward?.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })}` +
          ` · reverse auto-derived ${Number(json.result?.reverse?.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} · history rows: ${json.result?.history_rows_added}`,
      );
      setNewRate("");
      setRateNotes("");
      await loadRates();
    } catch (e) {
      setRateError(e instanceof Error ? e.message : "The rate change did not complete.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Foreign Exchange Desk"
        subtitle="Reference rates from fx_rates, executed conversions from the liquidity engine and treasury FX exposure — all read live from the database. Rate changes are attributed, sourced and history-snapshotted; pairs stay reciprocal by construction."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Reference rates</h2>
        <ResourceTable resource="fx-rates" columns={rateCols} exportName="fx-rates" searchPlaceholder="Search currency, source…" limit={50} />
      </section>

      <section className="p-4 rounded-xl border bg-[var(--surface)] space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Set reference rate (governed)</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          Sets the pair and auto-derives the reverse as 1/rate — pairs stay reciprocal, so no unbooked spread can be introduced. Every change requires a
          rate source (where the number came from) and lands in the rate history with your identity.
        </p>
        {rateFlash && <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm">{rateFlash}</div>}
        {rateError && <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">{rateError}</div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs">
            <span className="text-[var(--foreground-muted)]">Pair</span>
            <select value={pair} onChange={(e) => setPair(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm">
              {(rates ?? []).map((r) => (
                <option key={`${r.source_currency}->${r.destination_currency}`} value={`${r.source_currency}->${r.destination_currency}`}>
                  {r.source_currency} → {r.destination_currency} (current {r.rate})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-[var(--foreground-muted)]">New rate</span>
            <input
              type="number"
              step="any"
              min="0"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder={selected ? String(selected.rate) : "e.g. 2.3256"}
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
            {selected && reverse && (
              <span className="block text-[10px] text-[var(--foreground-muted)]">
                reverse {reverse.source_currency}→{reverse.destination_currency} will become {previewReverse} (currently {reverse.rate})
              </span>
            )}
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-[var(--foreground-muted)]">Rate source (required)</span>
            <input
              type="text"
              value={rateSource}
              onChange={(e) => setRateSource(e.target.value)}
              placeholder="e.g. CBN-DAILY-2026-09-14"
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-[var(--foreground-muted)]">Notes</span>
            <input
              type="text"
              value={rateNotes}
              onChange={(e) => setRateNotes(e.target.value)}
              placeholder="Why this rate?"
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void submitRate()}
            disabled={saving || !selected || !(Number(newRate) > 0) || rateSource.trim().length < 4}
            className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Update pair"}
          </button>
          <span className="text-[10px] text-[var(--foreground-muted)]">
            {selected && reverse
              ? `${selected.source_currency}→${selected.destination_currency} × ${reverse.source_currency}→${reverse.destination_currency} must stay within 1% of 1 — enforced at commit by the database.`
              : ""}
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Rate change history</h2>
        <ResourceTable resource="fx-rate-history" columns={historyCols} exportName="fx-rate-history" searchPlaceholder="Search pair…" limit={50} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Executed FX transactions</h2>
        <ResourceTable
          resource="fx-transactions"
          columns={txCols}
          exportName="fx-transactions"
          searchPlaceholder="Search FX reference…"
          filters={[{ key: "status", label: "Status" }, { key: "source_currency", label: "Source" }]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Treasury FX positions</h2>
        <ResourceTable resource="fx-positions" columns={posCols} exportName="fx-positions" limit={50} />
      </section>
    </div>
  );
}
