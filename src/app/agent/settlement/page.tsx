"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { agencyApiFetch } from "@/lib/agency/agentSession";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Landmark,
  RefreshCw,
} from "lucide-react";

interface SettlementBatchLine {
  id: string;
  batch_reference: string;
  currency: string;
  settlement_date: string;
  batch_status: string;
  commission_amount: number;
  commission_count: number;
  line_status: string;
  created_at: string;
}

export default function AgentSettlementPage() {
  const { t } = useAgent();
  const [batches, setBatches] = useState<SettlementBatchLine[]>([]);
  const [pendingByCurrency, setPendingByCurrency] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await agencyApiFetch("/api/v1/agency/settlements");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setBatches(json.data.batches || []);
        setPendingByCurrency(json.data.pending_unbatched_commission || {});
      } else {
        setError(json.error?.message || "Could not load settlement history.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "POSTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> POSTED TO LEDGER
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3 h-3" /> FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" /> {s || "PENDING"}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Commission Settlement
            </h1>
            <p className="text-xs text-slate-400">
              Daily internal ledger settlement of your earned commission.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Explainer banner — this is internal ledger settlement only, not an external bank payout */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-start gap-3 text-xs">
        <Landmark className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-slate-400">
          Settlement here posts your net earned commission from the agent commission ledger to the
          KoriePay treasury ledger account once daily. This is an internal accounting close, not an
          external bank transfer to your account — a separate bank payout will require live
          disbursement provider integration.
        </p>
      </div>

      {/* Pending / unbatched commission */}
      {Object.keys(pendingByCurrency).length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold">Earned, not yet settled:</span>
          <div className="flex items-center gap-3 font-mono font-bold text-emerald-400">
            {Object.entries(pendingByCurrency).map(([cur, amt]) => (
              <span key={cur}>
                {cur === "NGN" ? "₦" : cur === "XOF" ? "CFA " : `${cur} `}
                {amt.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-3xl bg-[#090f1e] border border-white/10 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
              <th className="p-4">Batch Reference</th>
              <th className="p-4">Settlement Date</th>
              <th className="p-4">Commission Amount</th>
              <th className="p-4"># Transactions</th>
              <th className="p-4">Batch Status</th>
              <th className="p-4">Your Line Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                  Loading settlement history...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                  No settlement batches yet. Batches run once daily against your earned commission.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-white">{b.batch_reference}</td>
                  <td className="p-4 text-slate-300">{b.settlement_date}</td>
                  <td className="p-4 text-emerald-400 font-extrabold">
                    {b.currency === "NGN" ? "₦" : b.currency === "XOF" ? "CFA " : `${b.currency} `}
                    {b.commission_amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-slate-300">{b.commission_count}</td>
                  <td className="p-4">{statusBadge(b.batch_status)}</td>
                  <td className="p-4">{statusBadge(b.line_status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
