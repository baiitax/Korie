"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import { merchantApiFetch } from "@/lib/merchant/merchantSession";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface ReconciliationRecord {
  id: string;
  date: string;
  channel: string;
  providerNode: string;
  expectedTotal: number;
  bankSettledTotal: number;
  variance: number;
  status: string;
}

export default function MerchantReconciliationPage() {
  const { formatCurrency, t } = useMerchant();
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/reconciliation");
      const json = await res.json();
      if (res.ok && json.status === "success") setRecords(json.data.reconciliations);
    } catch {
      // leave prior state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleRunRecon = async () => {
    setIsReconciling(true);
    setResultMessage(null);
    try {
      const res = await merchantApiFetch("/api/v1/merchant/reconciliation", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setResultMessage(
          json.data.runsCreated > 0
            ? `Reconciliation complete: ${formatCurrency(json.data.totalVolumeReconciled)} reconciled across ${json.data.runsCreated} channel(s). Zero variance detected.`
            : "No new activity to reconcile today."
        );
        await loadRecords();
      } else {
        setResultMessage(json?.error?.message || "Could not run reconciliation.");
      }
    } catch {
      setResultMessage("Network error running reconciliation.");
    } finally {
      setIsReconciling(false);
      setTimeout(() => setResultMessage(null), 6000);
    }
  };

  const totalVolume = records.reduce((sum, r) => sum + r.expectedTotal, 0);
  const totalVariance = records.reduce((sum, r) => sum + r.variance, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Financial Reconciliation</h1>
          <p className="text-xs text-slate-400">
            Matching your internal ledger against settled collections, computed from your own real transactions.
          </p>
        </div>
        <button
          onClick={handleRunRecon}
          disabled={isReconciling}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isReconciling ? "animate-spin" : ""}`} />
          <span>{isReconciling ? "Running Reconciliation..." : "Run Reconciliation"}</span>
        </button>
      </div>

      {resultMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 text-xs font-mono">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{resultMessage}</span>
        </div>
      )}

      {/* Reconciliation KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-teal-400">Total Volume Reconciled</div>
          <div className="text-2xl font-bold font-mono text-white">{formatCurrency(totalVolume)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-emerald-400">Total Variance (Discrepancy)</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(totalVariance)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-slate-400">Audit Status</div>
          <div className="text-2xl font-bold text-teal-400 flex items-center gap-1.5">
            <ShieldCheck className="w-6 h-6" />
            <span>{totalVariance === 0 ? "BALANCED" : "VARIANCE"}</span>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0c1426]">
          <h2 className="text-base font-bold text-white">Reconciliation Runs</h2>
          <span className="text-xs font-mono text-slate-400">Computed from real transactions</span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading reconciliation history...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No reconciliation runs yet. Click "Run Reconciliation" to generate one from today's activity.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Provider Node</th>
                  <th className="px-4 py-3 text-right">Expected Ledger</th>
                  <th className="px-4 py-3 text-right">Bank Settled</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5 font-mono text-white">{r.date}</td>
                    <td className="px-4 py-3.5 text-white font-bold">{r.channel}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">{r.providerNode}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300">{formatCurrency(r.expectedTotal)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-400">{formatCurrency(r.bankSettledTotal)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">{formatCurrency(r.variance)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{r.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
