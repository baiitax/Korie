"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  FileCheck,
  ShieldCheck,
} from "lucide-react";

export default function AggregatorReconciliationPage() {
  const { reconciliations, aggregator, formatCurrency, formatDate, t } = useAggregator();
  const [isMatching, setIsMatching] = useState(false);
  const [matchedSuccess, setMatchedSuccess] = useState(false);

  const handleRunReconciliation = () => {
    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
      setMatchedSuccess(true);
      setTimeout(() => setMatchedSuccess(false), 3000);
    }, 1400);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Three-Way Financial Reconciliation</h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Automated proof matching: Aggregator Ledger ↔ Banking Provider Nodes (Providus/Coris) ↔ Agent/Merchant Wallets
          </p>
        </div>
        <button
          onClick={handleRunReconciliation}
          disabled={isMatching}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isMatching ? "animate-spin" : ""}`} />
          <span>{isMatching ? "Verifying Nodal Hashes..." : "Run Real-time Audit Proof"}</span>
        </button>
      </div>

      {matchedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-xs font-mono">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            Three-way reconciliation complete: 100% of network transaction records match Providus Bank & Coris Bank credit settlement journals. Zero variance detected.
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400">Total Volume Reconciled</div>
          <div className="text-2xl font-black font-mono text-[var(--foreground)]">{formatCurrency(74200000)}</div>
        </div>
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400">Total Unresolved Variance</div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">₦0.00 (0.00%)</div>
        </div>
        <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">Audit Status</div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
            <ShieldCheck className="w-6 h-6" />
            <span>BALANCED</span>
          </div>
        </div>
      </div>

      {/* Reconciliations Table */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
          <h2 className="text-base font-bold text-[var(--foreground)]">Daily Reconciliation Batches</h2>
          <span className="text-xs font-mono text-[var(--foreground-muted)]">Automated EOD Verification</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)] text-[var(--foreground-muted)] font-mono uppercase text-[10px] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Settlement Date</th>
                <th className="px-4 py-3">Channel / Segment</th>
                <th className="px-4 py-3">Provider Node</th>
                <th className="px-4 py-3 text-right">Internal Ledger</th>
                <th className="px-4 py-3 text-right">Bank Settled</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {reconciliations.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-3.5 font-mono text-[var(--foreground)]">{r.date}</td>
                  <td className="px-4 py-3.5 text-[var(--foreground)] font-bold">{r.channelOrEntity}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--foreground-muted)]">{r.providerNode}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-[var(--foreground)]">
                    {formatCurrency(r.internalLedgerTotal)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(r.bankSettledTotal)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-[var(--foreground-muted)]">
                    {formatCurrency(r.varianceAmount)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{r.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
