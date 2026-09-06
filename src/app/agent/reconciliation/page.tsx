"use client";

import React from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

export default function AgentReconciliationPage() {
  const { reconciliations, isReconciliationsLoading, openReconciliation, t } = useAgent();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("common.reconciliation")}
            </h1>
            <p className="text-xs text-slate-400">
              End-of-day physical cash vault balancing and supervisor audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={openReconciliation}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Daily Reconciliation</span>
        </button>
      </div>

      {/* Reconciliation Logs Table */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4">Date</th>
              <th className="p-4">Opening Cash</th>
              <th className="p-4">Cash In / Out</th>
              <th className="p-4">Expected Cash</th>
              <th className="p-4">Physical Count</th>
              <th className="p-4">Variance</th>
              <th className="p-4">Audit Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {isReconciliationsLoading && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                  Loading reconciliation history…
                </td>
              </tr>
            )}
            {!isReconciliationsLoading && reconciliations.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                  No reconciliations submitted yet. Start your first end-of-day cash count above.
                </td>
              </tr>
            )}
            {reconciliations.map((rec) => (
              <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{rec.reconciliationDate}</td>
                <td className="p-4 text-slate-300">₦{rec.openingCash.toLocaleString()}</td>
                <td className="p-4">
                  <span className="text-emerald-400">+₦{rec.todayCashIn.toLocaleString()}</span> /{" "}
                  <span className="text-rose-400">-₦{rec.todayCashOut.toLocaleString()}</span>
                </td>
                <td className="p-4 text-white font-bold">₦{rec.expectedClosingCash.toLocaleString()}</td>
                <td className="p-4 text-emerald-300 font-bold">₦{rec.actualPhysicalCash.toLocaleString()}</td>
                <td className="p-4">
                  {rec.difference === 0 ? (
                    <span className="text-emerald-400 font-bold">₦0 (BALANCED)</span>
                  ) : (
                    <span className="text-rose-400 font-bold">
                      {rec.difference > 0 ? `+₦${rec.difference}` : `-₦${Math.abs(rec.difference)}`}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● {rec.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
