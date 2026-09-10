"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Download, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

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
  entries: { account: string; accountName?: string; entryType: "DEBIT" | "CREDIT"; amountMinor: number }[];
  createdAt: string;
}

function money(amountMajor: number, currency: string): string {
  const symbol = currency === "NGN" ? "₦" : currency === "XOF" ? "CFA " : `${currency} `;
  return `${symbol}${amountMajor.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/ledger/activity?kind=ALL&limit=200", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok || !json?.success) throw new Error(json?.error?.message || `HTTP ${r.status}`);
      setRows(json.data.rows);
      setNotes(json.data.notes || []);
      setSyncedAt(json.data.generatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ledger activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const journalsById = useMemo(() => new Map(rows.filter((r) => r.source === "LEDGER_JOURNAL").map((r) => [r.id, r])), [rows]);
  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);
  const typeOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.type))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (q && ![r.reference, r.description, r.type, r.parties.from || "", r.parties.to || ""].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, statusFilter, typeFilter, searchQuery]);

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Reference,Source,Type,Amount,Currency,Status,From,To,Journal,CreatedAt\n" +
      filtered
        .map(
          (t) =>
            `"${t.reference}","${t.source}","${t.type}",${t.amountMajor},"${t.currency}","${t.status}","${t.parties.from || ""}","${t.parties.to || ""}","${t.ledgerJournalId || ""}","${t.createdAt}"`,
        )
        .join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `koriepay-ledger-activity-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const entriesFor = (row: ActivityRow) => {
    if (row.entries.length > 0) return row.entries;
    if (row.ledgerJournalId && journalsById.has(row.ledgerJournalId)) return journalsById.get(row.ledgerJournalId)!.entries;
    return [];
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              TRANSACTION CONTROL CENTER · POSTED RECORD
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Ledger Activity & Rail Operations</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Every posted double-entry journal and every bank-core rail operation. Expand a row to inspect the debit/credit lines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {syncedAt && (
        <p className="text-[11px] font-mono text-slate-500">
          Read from LedgerService + BankCoreEngine · synced {new Date(syncedAt).toLocaleString()} · {rows.length} row(s)
        </p>
      )}
      {loading && rows.length === 0 && <p className="text-xs text-slate-400 font-mono">Loading posted activity…</p>}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 flex items-center justify-between gap-3">
          <span>{error} — showing nothing rather than stale rows.</span>
          <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-bold">Retry</button>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference, description, account..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold w-8"></th>
                <th className="p-4 font-semibold">Reference</th>
                <th className="p-4 font-semibold">Source</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">From / To</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {rows.length === 0 ? "No journals posted and no rail operations recorded yet — the honest empty ledger." : "No rows match the selected filters."}
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const lines = entriesFor(row);
                const open = expanded === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr onClick={() => setExpanded(open ? null : row.id)} className="hover:bg-white/5 cursor-pointer transition-colors group">
                      <td className="p-4 text-slate-500">
                        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="p-4 font-mono font-bold text-white group-hover:text-emerald-400">{row.reference}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${row.source === "LEDGER_JOURNAL" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-violet-500/10 text-violet-400 border border-violet-500/20"}`}>
                          {row.source === "LEDGER_JOURNAL" ? "JOURNAL" : "RAIL"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-white/5 text-slate-300">{row.type}</span>
                      </td>
                      <td className="p-4 font-mono font-bold text-white">
                        {row.type === "ACCOUNT_OPEN" ? <span className="text-slate-500 font-normal">—</span> : money(row.amountMajor, row.currency)}
                      </td>
                      <td className="p-4 font-mono text-[11px]">
                        {row.parties.from || row.parties.to ? (
                          <>
                            <div className="text-slate-300">{row.parties.from || "—"}</div>
                            <div className="text-slate-500">↳ {row.parties.to || "—"}</div>
                          </>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${row.status === "SUCCESSFUL" || row.status === "POSTED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : row.status === "FAILED" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                          ● {row.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500 text-[11px]">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-slate-950/60">
                        <td></td>
                        <td colSpan={7} className="p-4">
                          <p className="text-[11px] text-slate-400 mb-2">{row.description}</p>
                          {row.gatewayMode && <p className="text-[11px] font-mono text-slate-500 mb-2">rail mode: {row.gatewayMode} · journal: {row.ledgerJournalId || "none"}</p>}
                          {lines.length > 0 ? (
                            <table className="w-full text-left text-[11px] font-mono">
                              <thead>
                                <tr className="text-slate-500 uppercase text-[10px]">
                                  <th className="py-1 pr-4 font-semibold">Side</th>
                                  <th className="py-1 pr-4 font-semibold">Account</th>
                                  <th className="py-1 font-semibold text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {lines.map((e, i) => (
                                  <tr key={i}>
                                    <td className={`py-1 pr-4 font-bold ${e.entryType === "DEBIT" ? "text-amber-300" : "text-sky-300"}`}>{e.entryType}</td>
                                    <td className="py-1 pr-4 text-slate-300">{e.accountName || e.account} <span className="text-slate-600">{e.account}</span></td>
                                    <td className="py-1 text-right text-white">{money(e.amountMinor / 100, row.currency)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-[11px] font-mono text-slate-500">No journal lines — this operation moved no money or its journal is outside this window.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 space-y-1">
          {notes.map((n, i) => (
            <p key={i} className="text-[11px] text-slate-400 leading-relaxed">· {n}</p>
          ))}
        </div>
      )}
    </div>
  );
}
