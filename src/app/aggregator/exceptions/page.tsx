"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  AlertOctagon,
  CheckCircle2,
  AlertCircle,
  Zap,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function AggregatorExceptionsPage() {
  const { exceptions, resolveException, openLiquidityModal, t } = useAggregator();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExceptions = exceptions.filter(
    (e) =>
      e.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.affectedEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Operational Exceptions Center</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Centralized resolution queue for float shortages, compliance notices, rejected transfers, and provider delays
        </p>
      </div>

      {/* Exceptions List */}
      <div className="space-y-4">
        {filteredExceptions.map((exc) => (
          <div
            key={exc.id}
            className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[var(--foreground)] text-sm">{exc.reference}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    exc.severity === "HIGH"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {exc.severity} SEVERITY
                </span>
                <span className="text-xs text-teal-600 dark:text-teal-300 font-mono">• {exc.category}</span>
                <span className="text-xs text-[var(--foreground-muted)] font-mono">• Owner: {exc.owner}</span>
              </div>

              <div className="text-sm font-bold text-[var(--foreground)]">{exc.affectedEntity}</div>
              <p className="text-xs text-[var(--foreground)] max-w-2xl">{exc.description}</p>

              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[11px] text-teal-600 dark:text-teal-300 font-mono">
                <span className="font-bold text-amber-600 dark:text-amber-400">Recommended Action: </span>
                <span>{exc.recommendedAction}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
              {exc.category === "WALLET" && exc.currentState !== "RESOLVED" && (
                <button
                  onClick={() => openLiquidityModal()}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Inject Float</span>
                </button>
              )}

              {exc.currentState === "RESOLVED" ? (
                <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolved</span>
                </span>
              ) : (
                <button
                  onClick={() => resolveException(exc.id, "Manually verified & rebalanced float")}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
