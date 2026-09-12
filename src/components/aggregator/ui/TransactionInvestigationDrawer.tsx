"use client";

import React from "react";
import { useAggregator } from "../AggregatorContext";
import {
  X,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export const TransactionInvestigationDrawer: React.FC = () => {
  const {
    isInvestigateDrawerOpen,
    closeTransactionInvestigation,
    selectedTxForInvestigation,
    formatCurrency,
  } = useAggregator();

  if (!isInvestigateDrawerOpen || !selectedTxForInvestigation) return null;

  const tx = selectedTxForInvestigation;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--surface)] border-l border-[var(--border)] w-full max-w-lg h-full overflow-y-auto text-[var(--foreground)] flex flex-col justify-between shadow-2xl">
        <div>
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)] sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)] text-base">Transaction Investigation</h3>
                <p className="text-xs text-[var(--foreground-muted)] font-mono">{tx.reference}</p>
              </div>
            </div>
            <button
              onClick={closeTransactionInvestigation}
              className="p-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-5">
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-center space-y-1">
              <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">Gross Transaction Volume</div>
              <div className="text-3xl font-black font-mono text-[var(--foreground)]">{formatCurrency(tx.amount)}</div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    tx.status === "SUCCESSFUL"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : tx.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {tx.status === "SUCCESSFUL" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  <span>{tx.status}</span>
                </span>
                <span className="text-xs text-[var(--foreground-muted)] font-mono">• {tx.channel.replace("_", " ")}</span>
              </div>
            </div>

            {/* Identifiers Grid */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground-muted)] font-mono">Correlation ID:</span>
                <span className="font-mono text-teal-600 dark:text-teal-300">{tx.correlationId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground-muted)] font-mono">Provider Ref:</span>
                <span className="font-mono text-[var(--foreground)]">{tx.providerReference || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground-muted)] font-mono">Territory Node:</span>
                <span className="text-[var(--foreground)] font-medium">{tx.territoryName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground-muted)] font-mono">Executing Node:</span>
                <span className="text-[var(--foreground)] font-medium">{tx.agentName || tx.merchantName || "Central"}</span>
              </div>
            </div>

            {/* Financial Split Breakdown */}
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2 text-xs">
              <div className="text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400 font-bold">
                Commission & Fee Split
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Total Customer Fee:</span>
                <span className="font-mono text-[var(--foreground)]">{formatCurrency(tx.fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Agent Commission Earned:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(tx.agentCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--foreground-muted)]">Aggregator Commission:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(tx.aggregatorCommission)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">Net Settled to Node:</span>
                <span className="font-mono text-teal-600 dark:text-teal-300 font-bold">{formatCurrency(tx.netSettledToEntity)}</span>
              </div>
            </div>

            {/* State Machine Timeline */}
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase text-[var(--foreground-muted)] font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Transaction Audit Timeline</span>
              </div>

              <div className="space-y-3 pl-2 border-l-2 border-[var(--border)] ml-2">
                {(tx.timeline || []).map((step, idx) => (
                  <div key={idx} className="relative pl-4 space-y-0.5">
                    <div
                      className={`absolute -left-[9px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                        step.status === "COMPLETED"
                          ? "bg-emerald-500 border-emerald-400"
                          : step.status === "FAILED"
                          ? "bg-rose-500 border-rose-400"
                          : "bg-[var(--surface-3)] border-[var(--border)]"
                      }`}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--foreground)] font-mono">{step.stage}</span>
                      <span className="text-[10px] text-[var(--foreground-muted)] font-mono">
                        {step.timestamp ? new Date(step.timestamp).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--foreground-muted)]">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-end">
          <button
            onClick={closeTransactionInvestigation}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionInvestigationDrawer;
