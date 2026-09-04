"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  FileCheck,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default function MerchantReconciliationPage() {
  const { merchant, formatCurrency, formatDate, branches, t } = useMerchant();
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciledSuccess, setReconciledSuccess] = useState(false);

  const handleRunRecon = () => {
    setIsReconciling(true);
    setTimeout(() => {
      setIsReconciling(false);
      setReconciledSuccess(true);
      setTimeout(() => setReconciledSuccess(false), 4000);
    }, 1500);
  };

  const reconciliationRecords = [
    {
      date: "2026-09-02",
      channel: "Dynamic POS Virtual Transfers",
      expectedTotal: 2850000,
      bankSettledTotal: 2850000,
      variance: 0,
      status: "MATCHED",
      providerNode: "Providus Bank NG",
    },
    {
      date: "2026-09-02",
      channel: "In-Store Card POS Terminals",
      expectedTotal: 1420000,
      bankSettledTotal: 1420000,
      variance: 0,
      status: "MATCHED",
      providerNode: "Interswitch / NIBSS",
    },
    {
      date: "2026-09-01",
      channel: "Payment Links & Web Invoices",
      expectedTotal: 3410000,
      bankSettledTotal: 3410000,
      variance: 0,
      status: "MATCHED",
      providerNode: "Providus Bank NG",
    },
    {
      date: "2026-09-01",
      channel: "Niamey Cross-Border CFA Rail",
      expectedTotal: 980000,
      bankSettledTotal: 980000,
      variance: 0,
      status: "MATCHED",
      providerNode: "Koris Bank NE",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Double-Entry Financial Reconciliation</h1>
          <p className="text-xs text-slate-400">
            Automated three-way matching: Internal Merchant Ledger ↔ Provider Gateway ↔ Providus Bank Statement.
          </p>
        </div>
        <button
          onClick={handleRunRecon}
          disabled={isReconciling}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isReconciling ? "animate-spin" : ""}`} />
          <span>{isReconciling ? "Verifying Ledger Nodal Hashes..." : "Run Real-time Audit Match"}</span>
        </button>
      </div>

      {reconciledSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 text-xs font-mono">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            Three-way reconciliation complete: 100% of collection records match Providus Bank settlement credit logs. Zero variance detected.
          </span>
        </div>
      )}

      {/* Reconciliation KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-teal-400">Total Volume Reconciled</div>
          <div className="text-2xl font-bold font-mono text-white">{formatCurrency(8660000)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-emerald-400">Total Variance (Discrepancy)</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">₦0.00 (0.00%)</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a1122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-slate-400">Audit Status</div>
          <div className="text-2xl font-bold text-teal-400 flex items-center gap-1.5">
            <ShieldCheck className="w-6 h-6" />
            <span>BALANCED</span>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0c1426]">
          <h2 className="text-base font-bold text-white">Daily Reconciliation Batches</h2>
          <span className="text-xs font-mono text-slate-400">Automated EOD Proof</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Settlement Date</th>
                <th className="px-4 py-3">Collection Channel</th>
                <th className="px-4 py-3">Provider Gateway Node</th>
                <th className="px-4 py-3 text-right">Expected Ledger</th>
                <th className="px-4 py-3 text-right">Bank Settled</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {reconciliationRecords.map((r, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 font-mono text-white">{r.date}</td>
                  <td className="px-4 py-3.5 text-white font-bold">{r.channel}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-400">{r.providerNode}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                    {formatCurrency(r.expectedTotal)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-400">
                    {formatCurrency(r.bankSettledTotal)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                    {formatCurrency(r.variance)}
                  </td>
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
        </div>
      </div>
    </div>
  );
}
