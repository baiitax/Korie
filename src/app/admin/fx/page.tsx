"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader, fmtMoney, fmtDate, fmtAgo } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { adminApiFetch } from "@/lib/admin/adminSession";

/**
 * FX desk — live views, the governed rate editor, and mark-to-market
 * revaluation.
 *
 * Reference rates (fx_rates), executed conversions (liquidity.fx), treasury
 * FX exposure — all read live from the database. Rate changes go through
 * update_fx_rate_pair (migration 20260914000053): attributed, sourced,
 * history-snapshotted, and reciprocal by construction (the reverse rate is
 * auto-derived as 1/rate, so no unbooked spread can be introduced — F18).
 *
 * The ledger FX position and revaluation marks (migration 20260914000057)
 * close F20/B7-part-2: per-currency desk position from the FX-book accounts,
 * valued at the governed rate; BASELINE opening marks (zero P&L — no gain
 * invented at inception); unrealized gain/loss journals when the rate moves;
 * stale marks flagged and counted by the nightly close.
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

  // ---- FX position & revaluation state ----
  type FxPosition = {
    currency: string;
    is_base: boolean;
    book_accounts: string;
    position_units: number;
    current_rate: number | null;
    rate_source: string | null;
    market_value_base: number;
    last_valuation_date: string | null;
    last_rate_used: number | null;
    cumulative_unrealized: number;
    stale_mark: boolean;
  };
  const [positions, setPositions] = useState<FxPosition[] | null>(null);
  const [revalDate, setRevalDate] = useState("");
  const [revalRunning, setRevalRunning] = useState(false);
  const [revalError, setRevalError] = useState<string | null>(null);
  const [revalFlash, setRevalFlash] = useState<string | null>(null);

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

  const loadPositions = useCallback(async () => {
    try {
      const res = await adminApiFetch("/api/admin/fx/position");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The position report failed to load.");
      setPositions(json.positions ?? []);
    } catch (e) {
      setRevalError(e instanceof Error ? e.message : "The position report failed to load.");
    }
  }, []);

  useEffect(() => {
    void loadRates();
    void loadPositions();
  }, [loadRates, loadPositions]);

  const runRevaluation = async () => {
    setRevalRunning(true);
    setRevalError(null);
    setRevalFlash(null);
    try {
      const res = await adminApiFetch("/api/admin/fx/position", {
        method: "POST",
        body: JSON.stringify(revalDate ? { date: revalDate } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The revaluation did not complete.");
      const r = json.result;
      const noRate = (r.skipped_no_rate as string[]) ?? [];
      setRevalFlash(
        `${r.valuation_date}: ${r.marks_posted} mark(s) posted, ${r.baselines} baseline(s), ${r.marks_no_change} no-change, ` +
          `${r.skipped_zero_position} zero-position, ${r.skipped_already_marked} already marked` +
          (noRate.length ? ` — NO GOVERNED RATE for ${noRate.join(", ")} (refused, not guessed)` : "") +
          ` · unrealized P&L booked: ₦${Number(r.total_unrealized_gain_loss).toLocaleString()}`,
      );
      await loadPositions();
    } catch (e) {
      setRevalError(e instanceof Error ? e.message : "The revaluation did not complete.");
    } finally {
      setRevalRunning(false);
    }
  };

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
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          Ledger FX position &amp; revaluation (mark-to-market)
        </h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          The desk&apos;s true position from the FX-book ledger accounts, valued at the governed rate. A BASELINE mark establishes the opening basis at the
          current rate (no gain is invented at inception); when the rate moves, the unrealized gain/loss is posted through the sanctioned adjustment-journal
          path. A stale mark (rate moved since the last marking) is flagged — and counted by the nightly close as an exception.
        </p>
        {revalFlash && <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm">{revalFlash}</div>}
        {revalError && <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">{revalError}</div>}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wider text-[var(--foreground-muted)]">
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2 text-right">Units (FX books)</th>
                <th className="px-3 py-2 text-right">Governed rate</th>
                <th className="px-3 py-2 text-right">Market value (₦)</th>
                <th className="px-3 py-2 text-right">Cumulative unrealized</th>
                <th className="px-3 py-2">Last mark</th>
                <th className="px-3 py-2">Rate source</th>
                <th className="px-3 py-2">State</th>
              </tr>
            </thead>
            <tbody>
              {(positions ?? []).map((p) => (
                <tr key={p.currency} className="border-b last:border-0">
                  <td className="px-3 py-2 font-bold">{p.currency}{p.is_base ? " (base)" : ""}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.position_units.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {p.is_base ? "—" : p.current_rate == null ? <span className="text-rose-500">no governed rate</span> : p.current_rate.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.market_value_base.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${p.cumulative_unrealized > 0 ? "text-emerald-500" : p.cumulative_unrealized < 0 ? "text-rose-400" : ""}`}>
                    {p.cumulative_unrealized.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground-muted)]">
                    {p.last_valuation_date ? `${p.last_valuation_date} @ ${Number(p.last_rate_used).toFixed(6)}` : p.is_base ? "n/a (base)" : "never marked"}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground-muted)]">{p.rate_source ?? "—"}</td>
                  <td className="px-3 py-2">{p.stale_mark ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">STALE MARK</span> : <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">MARKED</span>}</td>
                </tr>
              ))}
              {positions === null && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-[var(--foreground-muted)]">Loading position…</td>
                </tr>
              )}
              {positions?.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-[var(--foreground-muted)]">No FX-book accounts exist yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="space-y-1 text-xs">
            <span className="text-[var(--foreground-muted)]">Valuation date (optional — defaults to today)</span>
            <input
              type="date"
              value={revalDate}
              onChange={(e) => setRevalDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
          </label>
          <button
            onClick={() => void runRevaluation()}
            disabled={revalRunning}
            className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold disabled:opacity-50"
          >
            {revalRunning ? "Marking…" : "Run revaluation"}
          </button>
          <span className="text-[10px] text-[var(--foreground-muted)]">
            One mark per date &amp; currency; already-marked dates are reported as no-ops. Positions without a governed rate are refused, never guessed.
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Revaluation marks</h2>
        <ResourceTable
          resource="fx-revaluations"
          columns={[
            { key: "valuation_date", label: "Date" },
            { key: "position_currency", label: "Ccy", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.position_currency}</span> },
            { key: "position_units", label: "Units", className: "text-right", render: (r) => <span className="tabular-nums">{Number(r.position_units).toLocaleString()}</span> },
            { key: "rate_used", label: "Rate used", className: "text-right", render: (r) => <span className="tabular-nums">{Number(r.rate_used).toFixed(6)}</span> },
            { key: "market_value_base", label: "Market value (₦)", className: "text-right", render: (r) => <span className="tabular-nums">{Number(r.market_value_base).toLocaleString()}</span> },
            { key: "unrealized_gain_loss", label: "Unrealized P&L", className: "text-right", render: (r) => <span className={`tabular-nums ${Number(r.unrealized_gain_loss) > 0 ? "text-emerald-500" : Number(r.unrealized_gain_loss) < 0 ? "text-rose-400" : ""}`}>{Number(r.unrealized_gain_loss).toLocaleString()}</span> },
            { key: "status", label: "Status", render: (r) => <StatusChip value={r.status as string} /> },
            { key: "rate_source", label: "Rate source", hideOnMobile: true },
            { key: "run_by", label: "Run by", hideOnMobile: true },
          ]}
          exportName="fx-revaluations"
          searchPlaceholder="Search currency, source, run by…"
          filters={[{ key: "status", label: "Status" }, { key: "position_currency", label: "Currency" }]}
          limit={50}
        />
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
