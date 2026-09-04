"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Receipt,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function TransactionDetailPage() {
  const params = useParams();
  const { transactions, formatCurrency, formatDate, t } = useAggregator();

  const tx = transactions.find((t) => t.id === params.id) || transactions[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/aggregator/transactions"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Transaction Ledger</span>
      </Link>

      {/* Header Info */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#091122] border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Transaction ID</div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-mono">{tx.reference}</h1>
            <div className="text-xs text-teal-300 font-mono mt-0.5">Correlation: {tx.correlationId}</div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold self-start sm:self-auto ${
              tx.status === "SUCCESSFUL"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : tx.status === "PENDING"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {tx.status}
          </span>
        </div>

        {/* Financial Split */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Gross Volume</div>
            <div className="text-lg font-bold font-mono text-white">{formatCurrency(tx.amount)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Fee</div>
            <div className="text-lg font-bold font-mono text-slate-300">{formatCurrency(tx.fee)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Agent Commission</div>
            <div className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(tx.agentCommission)}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Aggregator Commission</div>
            <div className="text-lg font-bold font-mono text-amber-400">{formatCurrency(tx.aggregatorCommission)}</div>
          </div>
        </div>
      </div>

      {/* State Machine Timeline */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#091122] border border-white/10 space-y-5">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-400" />
          <span>7-Stage Nodal State Machine Trace</span>
        </h3>

        <div className="space-y-4 pl-3 border-l-2 border-white/10 ml-2">
          {tx.timeline.map((step, idx) => (
            <div key={idx} className="relative pl-4 space-y-0.5">
              <div
                className={`absolute -left-[17px] top-1 w-4 h-4 rounded-full border-2 ${
                  step.status === "COMPLETED"
                    ? "bg-emerald-500 border-emerald-400"
                    : step.status === "FAILED"
                    ? "bg-rose-500 border-rose-400"
                    : "bg-slate-800 border-slate-600"
                }`}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white font-mono">{step.stage}</span>
                <span className="text-[10px] text-slate-500 font-mono">{step.timestamp}</span>
              </div>
              <p className="text-xs text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
