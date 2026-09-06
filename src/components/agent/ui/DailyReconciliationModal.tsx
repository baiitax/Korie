"use client";

import React, { useState } from "react";
import { useAgent } from "../AgentContext";
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Send,
  Coins,
} from "lucide-react";

export const DailyReconciliationModal: React.FC = () => {
  const {
    isReconciliationModalOpen,
    closeReconciliation,
    liquidity,
    reconciliations,
    submitReconciliation,
    t,
  } = useAgent();

  // Best-effort live preview of opening cash, mirroring the server's own
  // computation in submit_agent_cash_reconciliation(): yesterday's real
  // physical count if one was submitted, otherwise the real CASH_IN_HAND
  // ledger balance backed out by today's net cash movement. The server is
  // still the sole source of truth for the actually-recorded figures —
  // this is only shown so the agent isn't typing blind.
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const priorDay = reconciliations.find((r) => r.reconciliationDate === yesterday);
  const openingCash = priorDay
    ? priorDay.actualPhysicalCash
    : Math.max(0, liquidity.cashInHand - liquidity.todayCashInVolume + liquidity.todayCashOutVolume);
  const expectedClosingCash = openingCash + liquidity.todayCashInVolume - liquidity.todayCashOutVolume;

  const [physicalCashInput, setPhysicalCashInput] = useState<string>(String(expectedClosingCash));
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isReconciliationModalOpen) return null;

  const parsedActual = parseFloat(physicalCashInput) || 0;
  const variance = parsedActual - expectedClosingCash;
  const isBalanced = variance === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await submitReconciliation(parsedActual, notes);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Could not submit reconciliation. Please try again.");
      return;
    }
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      closeReconciliation();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#090f1e] border border-white/15 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <FileSpreadsheet className="w-5 h-5" />
            <span>{t("reconciliation.title")}</span>
          </div>
          <button
            onClick={closeReconciliation}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">
              {t("reconciliation.reconciliationSuccess")}
            </h3>
            <p className="text-xs text-slate-400">
              Your physical cash vault report has been cryptographically sealed and submitted for supervisor audit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {/* Calculation Breakdown Card */}
            <div className="rounded-2xl bg-slate-950/70 border border-white/5 divide-y divide-white/5 font-mono">
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-400">{t("reconciliation.openingCash")}</span>
                <span className="text-white">₦{openingCash.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-400">{t("reconciliation.todayCashIn")}</span>
                <span className="text-emerald-400">+₦{liquidity.todayCashInVolume.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-400">{t("reconciliation.todayCashOut")}</span>
                <span className="text-rose-400">-₦{liquidity.todayCashOutVolume.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/[0.02]">
                <span className="text-slate-300 font-bold">{t("reconciliation.expectedCash")}</span>
                <span className="text-white font-extrabold text-sm">
                  ₦{expectedClosingCash.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actual Physical Cash Input */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                {t("reconciliation.actualCash")} (₦)
              </label>
              <input
                type="number"
                min="0"
                required
                value={physicalCashInput}
                onChange={(e) => setPhysicalCashInput(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-base font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Variance Status Banner */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between font-mono font-bold ${
                isBalanced
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <span>{t("reconciliation.variance")}:</span>
              <span>
                {variance >= 0 ? `+₦${variance.toLocaleString()}` : `-₦${Math.abs(variance).toLocaleString()}`}
              </span>
            </div>

            {!isBalanced && (
              <div className="space-y-1.5">
                <label className="font-semibold text-rose-400">
                  {t("reconciliation.discrepancyNote")}
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain reason for discrepancy (e.g. pending physical cash deposit, change shortage)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-rose-500/30 text-white text-xs resize-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? "Submitting Report..." : t("reconciliation.submitReportBtn")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DailyReconciliationModal;
