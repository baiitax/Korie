"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/consoleKeys";

interface ActivityRow {
  id: string;
  source: "LEDGER_JOURNAL" | "BANK_TXN";
  reference: string;
  type: string;
  description: string;
  currency: string;
  amountMajor: number;
  status: string;
  parties: { from?: string; to?: string };
  ledgerJournalId: string | null;
  gatewayMode: string | null;
  createdAt: string;
}

const TRANSFER_TYPES = new Set(["INTERNAL_TRANSFER", "NIP_OUT"]);

function money(amountMajor: number, currency: string): string {
  const symbol = currency === "NGN" ? "₦" : currency === "XOF" ? "CFA " : `${currency} `;
  return `${symbol}${amountMajor.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TransfersAdminPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch("/api/admin/ledger/activity?kind=BANK&limit=200", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok || !json?.success) throw new Error(json?.error?.message || `HTTP ${r.status}`);
      setRows((json.data.rows as ActivityRow[]).filter((t) => TRANSFER_TYPES.has(t.type)));
      setSyncedAt(json.data.generatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transfer activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const byCcy = new Map<string, number>();
    for (const t of rows) byCcy.set(t.currency, (byCcy.get(t.currency) || 0) + t.amountMajor);
    return Array.from(byCcy.entries());
  }, [rows]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            INTERBANK & INTERNAL TRANSFERS · RAIL RECORD
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Transfer Routing & Execution</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal wallet-to-wallet transfers and NIP outbound queue as recorded by the bank core — each row links to its posted journal.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {syncedAt && (
        <p className="text-[11px] font-mono text-slate-500">
          Read from BankCoreEngine · synced {new Date(syncedAt).toLocaleString()} · {rows.length} transfer(s)
          {totals.length > 0 && <> · moved {totals.map(([c, v]) => money(v, c)).join(" · ")}</>}
        </p>
      )}
      {loading && rows.length === 0 && <p className="text-xs text-slate-400 font-mono">Loading rail transfers…</p>}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 flex items-center justify-between gap-3">
          <span>{error} — showing nothing rather than stale rows.</span>
          <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-bold">Retry</button>
        </div>
      )}

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4 font-semibold">Reference</th>
              <th className="p-4 font-semibold">Rail</th>
              <th className="p-4 font-semibold">From</th>
              <th className="p-4 font-semibold">To</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Mode</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Journal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No internal transfers or NIP outbound recorded yet.
                </td>
              </tr>
            )}
            {rows.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-mono font-bold text-white">{tx.reference}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-white/5 text-slate-300">{tx.type}</span>
                </td>
                <td className="p-4 font-mono text-slate-300">{tx.parties.from || "—"}</td>
                <td className="p-4 font-mono text-slate-300">{tx.parties.to || "—"}</td>
                <td className="p-4 font-mono font-bold text-emerald-400">{money(tx.amountMajor, tx.currency)}</td>
                <td className="p-4 font-mono text-[11px] text-slate-400">{tx.gatewayMode || "—"}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${tx.status === "SUCCESSFUL" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    ● {tx.status}
                  </span>
                </td>
                <td className="p-4 text-right font-mono text-[11px] text-slate-500">
                  {tx.ledgerJournalId ? `${tx.ledgerJournalId.slice(0, 18)}…` : "none"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          · Cross-border Nigeria ↔ Niger rails have no recorded operations in the bank core — only the rails above exist here. A corridor with no rows is a corridor with no movement, not a missing feed.
        </p>
      </div>
    </div>
  );
}
