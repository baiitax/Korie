"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { LiquidityAmount } from "@/components/agent/ui/LiquidityAmount";
import { FloatTopUpMethod } from "@/types/agent";
import {
  ArrowLeft,
  Coins,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Landmark,
  Truck,
  Users,
} from "lucide-react";

const METHOD_LABELS: Record<FloatTopUpMethod, string> = {
  BANK_TRANSFER: "Bank Transfer (NUBAN Credit)",
  CASH_DEPOSIT_HUB: "Cash Deposit at CIT Hub",
  SUPER_AGENT_ALLOCATION: "Super Agent Allocation",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  PROCESSING: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  REJECTED: "bg-rose-500/15 text-rose-300 border-rose-500/20",
};

export default function AgentLiquidityPage() {
  const { liquidity, agent, t, floatTopUpRequests, isFloatTopUpLoading, submitFloatTopUpRequest, refreshLiquidity, refreshFloatTopUpRequests } = useAgent();
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepMessage, setSweepMessage] = useState<string | null>(null);

  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestMethod, setRequestMethod] = useState<FloatTopUpMethod>("BANK_TRANSFER");
  const [proofReference, setProofReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const currencySymbol = liquidity.currency === "XOF" ? "CFA" : "₦";

  const myRequests = floatTopUpRequests
    .filter((r) => r.agentId === agent.id)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  const hasPendingRequest = myRequests.some((r) => r.status === "PENDING");

  // Re-fetches the agent's real ledger balance and top-up history from the
  // server — this button never fabricates a "synchronized" state locally,
  // it just forces an immediate refresh of what the ledger already says.
  const handleSweepFloat = async () => {
    setIsSweeping(true);
    await Promise.all([refreshLiquidity(), refreshFloatTopUpRequests()]);
    setIsSweeping(false);
    setSweepMessage("Float balance refreshed from the ledger.");
    setTimeout(() => setSweepMessage(null), 3000);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amountNum = Number(requestAmount);
    if (!amountNum || amountNum <= 0) {
      setFormError("Enter a valid top-up amount.");
      return;
    }

    setIsSubmitting(true);
    const result = await submitFloatTopUpRequest({
      amount: amountNum,
      method: requestMethod,
      proofReference: proofReference || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || "Could not submit float top-up request.");
      return;
    }

    setFormSuccess(
      `Request for ${currencySymbol}${amountNum.toLocaleString()} submitted. It is now pending Treasury review.`
    );
    setRequestAmount("");
    setProofReference("");
    setIsRequestFormOpen(false);
    setTimeout(() => setFormSuccess(null), 5000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
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
              {t("common.liquidityCenter")}
            </h1>
            <p className="text-xs text-slate-400">
              Agent float management, cash thresholds and bank vault sweeping.
            </p>
          </div>
        </div>

        <button
          onClick={handleSweepFloat}
          disabled={isSweeping}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSweeping ? "animate-spin" : ""}`} />
          <span>Sync Float</span>
        </button>
      </div>

      {sweepMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{sweepMessage}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Float Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">Digital Wallet Float</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            <LiquidityAmount value={`${currencySymbol}${liquidity.walletFloat.toLocaleString()}`} />
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Providus Clearing Rail</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">Physical Cash In Hand</div>
          <div className="text-2xl font-extrabold text-white">
            <LiquidityAmount value={`${currencySymbol}${liquidity.cashInHand.toLocaleString()}`} />
          </div>
          <div className="text-[10px] text-slate-400 font-sans">Vault Physical Count</div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 to-[#090f1e] border border-amber-500/30 space-y-1">
          <div className="text-[10px] uppercase text-amber-400 font-bold">Total Liquidity</div>
          <div className="text-2xl font-extrabold text-white">
            <LiquidityAmount value={`${currencySymbol}${liquidity.totalLiquidity.toLocaleString()}`} />
          </div>
          <div className="text-[10px] text-emerald-400 font-sans">● {liquidity.health} Status</div>
        </div>
      </div>

      {liquidity.health === "LOW" || liquidity.health === "CRITICAL" ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>
            Liquidity is running {liquidity.health === "CRITICAL" ? "critically" : ""} low. Submit a
            float top-up request below to avoid rejected transactions.
          </span>
        </div>
      ) : null}

      {/* Float Top-Up Request */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
            Float Top-Up Requests
          </h2>
          <button
            onClick={() => setIsRequestFormOpen((v) => !v)}
            disabled={hasPendingRequest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {isRequestFormOpen ? "Cancel" : "New Request"}
          </button>
        </div>

        {hasPendingRequest && !isRequestFormOpen && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>You have a request pending Treasury review. It must be resolved before submitting another.</span>
          </div>
        )}

        {isRequestFormOpen && (
          <form onSubmit={handleSubmitRequest} className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Requested Amount ({liquidity.currency})
              </label>
              <input
                type="number"
                min={1}
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder={`e.g. 500000`}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Top-Up Method
              </label>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    { id: "BANK_TRANSFER", icon: Landmark },
                    { id: "CASH_DEPOSIT_HUB", icon: Truck },
                    { id: "SUPER_AGENT_ALLOCATION", icon: Users },
                  ] as { id: FloatTopUpMethod; icon: typeof Landmark }[]
                ).map(({ id, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setRequestMethod(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-semibold transition-colors ${
                      requestMethod === id
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-[#090f1e] text-slate-300 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {METHOD_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Proof / Deposit Reference (optional)
              </label>
              <input
                type="text"
                value={proofReference}
                onChange={(e) => setProofReference(e.target.value)}
                placeholder="e.g. NIP-TRF-88213094"
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-bold transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Float Top-Up Request"}
            </button>
          </form>
        )}

        {/* Request History */}
        <div className="space-y-2 pt-1">
          {isFloatTopUpLoading && (
            <p className="text-xs text-slate-500 text-center py-4">Loading top-up history…</p>
          )}
          {!isFloatTopUpLoading && myRequests.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No float top-up requests yet.</p>
          )}
          {myRequests.map((r) => (
            <div
              key={r.id}
              className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-white font-mono">
                  {currencySymbol}{r.amount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {METHOD_LABELS[r.method]} • {new Date(r.requestedAt).toLocaleString()}
                </div>
                {r.notes && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{r.notes}</div>}
              </div>
              <span
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status]}`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dedicated Float Top-Up Account */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-3 shadow-xl text-xs">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
          Dedicated Float Top-Up Account
        </h2>
        <p className="text-slate-400">
          Transfer funds from any Nigerian bank to this dedicated NUBAN, then submit a top-up request above
          with the deposit reference so Treasury can match and approve the credit.
        </p>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-between font-mono">
          <div>
            <div className="text-slate-400 text-[10px]">Providus Bank (Agent Float Sweeper)</div>
            <div className="text-base font-extrabold text-white mt-0.5">0123984123</div>
            <div className="text-slate-400 text-[11px] font-sans">
              KoriePay / {agent.businessName}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
            ● Real-Time Credit
          </span>
        </div>
      </div>
    </div>
  );
}
