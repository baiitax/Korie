"use client";

import React from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  FileSpreadsheet,
  Download,
  Building2,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
} from "lucide-react";

export default function AggregatorSettlementsPage() {
  const { settlements, aggregator, formatCurrency, formatDate, t } = useAggregator();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Settlement Center</h1>
        <p className="text-xs text-slate-400">
          NIBSS Direct Settlement Batches automatically transferred to {aggregator.settlementBank} ({aggregator.settlementAccountMasked})
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-slate-400">Total Settled (Trailing 30d)</div>
          <div className="text-2xl font-black font-mono text-white">
            {formatCurrency(settlements.reduce((acc, s) => acc + s.netAggregatorCommissionSettled, 0))}
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-teal-400">Total Network Volume Cleared</div>
          <div className="text-2xl font-black font-mono text-teal-300">
            {formatCurrency(settlements.reduce((acc, s) => acc + s.grossNetworkVolume, 0))}
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-[#091122] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono uppercase text-emerald-400">Settlement SLA</div>
          <div className="text-2xl font-black font-mono text-emerald-400">100.0%</div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#060a16]">
          <h2 className="text-base font-bold text-white">Direct Credit Settlement History</h2>
          <span className="text-xs font-mono text-teal-400">Providus Gateway Auto-Clearing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a16] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Batch Reference</th>
                <th className="px-4 py-3">Destination Account</th>
                <th className="px-4 py-3 text-center">Tx Count</th>
                <th className="px-4 py-3 text-right">Gross Network TPV</th>
                <th className="px-4 py-3 text-right">Interchange Fees</th>
                <th className="px-4 py-3 text-right">Net Commission</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Settled Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {settlements.map((batch) => (
                <tr key={batch.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-bold text-white">{batch.batchReference}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIBSS: {batch.nibssSessionId}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-white font-bold">{batch.destinationBank}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{batch.destinationAccountMasked}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-white">{batch.includedTransactionsCount}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                    {formatCurrency(batch.grossNetworkVolume)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                    {formatCurrency(batch.totalInterchangeFees)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(batch.netAggregatorCommissionSettled)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{batch.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                    {batch.settledAt ? formatDate(batch.settledAt) : "Pending"}
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
