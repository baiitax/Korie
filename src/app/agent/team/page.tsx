"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { SubAgent } from "@/types/agent";
import {
  ArrowLeft,
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  CheckCircle2,
  XCircle,
  MapPin,
  Activity,
} from "lucide-react";

const HEALTH_STYLES: Record<string, string> = {
  HEALTHY: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  WATCH: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  LOW: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  CRITICAL: "bg-rose-500/15 text-rose-300 border-rose-500/20",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  LOW_FLOAT: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  SUSPENDED: "bg-rose-500/15 text-rose-300 border-rose-500/20",
};

type ModalMode = "ALLOCATE" | "RECLAIM" | null;

export default function AgentTeamPage() {
  const {
    agent,
    liquidity,
    subAgents,
    floatAllocations,
    allocateFloatToSubAgent,
    reclaimFloatFromSubAgent,
    t,
  } = useAgent();

  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeSubAgent, setActiveSubAgent] = useState<SubAgent | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSuperAgent = agent.tier === "SUPER_AGENT";

  const filteredSubAgents = useMemo(
    () =>
      subAgents.filter(
        (s) =>
          s.agentName.toLowerCase().includes(search.toLowerCase()) ||
          s.businessName.toLowerCase().includes(search.toLowerCase()) ||
          s.agentCode.toLowerCase().includes(search.toLowerCase())
      ),
    [subAgents, search]
  );

  const teamTotals = useMemo(() => {
    const totalFloat = subAgents.reduce((sum, s) => sum + s.walletFloat, 0);
    const totalVolume = subAgents.reduce((sum, s) => sum + s.todayVolume, 0);
    const lowFloatCount = subAgents.filter((s) => s.status === "LOW_FLOAT" || s.health === "CRITICAL").length;
    return { totalFloat, totalVolume, lowFloatCount };
  }, [subAgents]);

  const openModal = (mode: ModalMode, sub: SubAgent) => {
    setModalMode(mode);
    setActiveSubAgent(sub);
    setAmount("");
    setNote("");
    setError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveSubAgent(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubAgent || !modalMode) return;

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result =
      modalMode === "ALLOCATE"
        ? await allocateFloatToSubAgent({ subAgentId: activeSubAgent.id, amount: amountNum, note: note || undefined })
        : await reclaimFloatFromSubAgent({ subAgentId: activeSubAgent.id, amount: amountNum, note: note || undefined });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Operation failed.");
      return;
    }

    setSuccessMsg(
      `${modalMode === "ALLOCATE" ? "Allocated" : "Reclaimed"} ${amountNum.toLocaleString()} ${activeSubAgent.currency} ${
        modalMode === "ALLOCATE" ? "to" : "from"
      } ${activeSubAgent.agentName}.`
    );
    closeModal();
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  if (!isSuperAgent) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4">
          <Link
            href="/agent"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-extrabold text-white">Team Management</h1>
        </div>
        <div className="p-6 rounded-3xl bg-[#090f1e] border border-white/10 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm text-slate-300 font-semibold">Super Agent tier required</p>
          <p className="text-xs text-slate-500">
            Sub-agent float allocation and team oversight is available only to accounts upgraded to the
            Super Agent tier. Contact your Aggregator to request an upgrade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Sub-Agent Team Management</h1>
            <p className="text-xs text-slate-400">
              Monitor sub-agent liquidity health and allocate or reclaim float across your network.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {agent.tier}
        </span>
      </div>

      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">Sub-Agents Managed</div>
          <div className="text-2xl font-extrabold text-white">{subAgents.length}</div>
          <div className="text-[10px] text-slate-400 font-sans">Across Nigeria &amp; Niger Republic</div>
        </div>
        <div className="p-5 rounded-3xl bg-[#090f1e] border border-white/10 space-y-1">
          <div className="text-[10px] uppercase text-slate-400">Total Sub-Agent Float</div>
          <div className="text-2xl font-extrabold text-emerald-400">₦{teamTotals.totalFloat.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 font-sans">Combined wallet float (NGN-denominated shown)</div>
        </div>
        <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-950/40 to-[#090f1e] border border-rose-500/30 space-y-1">
          <div className="text-[10px] uppercase text-rose-400 font-bold">Needs Attention</div>
          <div className="text-2xl font-extrabold text-white">{teamTotals.lowFloatCount}</div>
          <div className="text-[10px] text-slate-400 font-sans">Sub-agents with low float or critical health</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sub-agents by name, business or agent code..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#090f1e] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Sub-Agent Roster */}
      <div className="space-y-3">
        {filteredSubAgents.map((sub) => {
          const symbol = sub.currency === "XOF" ? "CFA" : "₦";
          return (
            <div key={sub.id} className="rounded-3xl bg-[#090f1e] border border-white/10 p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-extrabold text-xs shrink-0">
                    {sub.agentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">{sub.agentName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{sub.businessName}</div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {sub.cityOrLGA} • {sub.agentCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[sub.status]}`}>
                    {sub.status.replace("_", " ")}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${HEALTH_STYLES[sub.health]}`}>
                    {sub.health}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase">Wallet Float</div>
                  <div className="text-white font-bold">{symbol}{sub.walletFloat.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase">Cash In Hand</div>
                  <div className="text-white font-bold">{symbol}{sub.cashInHand.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase">Today Volume</div>
                  <div className="text-white font-bold">{symbol}{sub.todayVolume.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Tx Today
                  </div>
                  <div className="text-white font-bold">{sub.todayTransactionCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openModal("ALLOCATE", sub)}
                  disabled={sub.status === "SUSPENDED"}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/20 text-emerald-300 text-xs font-bold transition-colors"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5" /> Allocate Float
                </button>
                <button
                  onClick={() => openModal("RECLAIM", sub)}
                  disabled={sub.walletFloat <= 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-500/20 text-amber-300 text-xs font-bold transition-colors"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Reclaim Float
                </button>
              </div>
            </div>
          );
        })}

        {filteredSubAgents.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 rounded-3xl bg-[#090f1e] border border-white/10">
            No sub-agents match your search.
          </div>
        )}
      </div>

      {/* Allocation History */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-3 shadow-xl">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
          Recent Float Allocation Activity
        </h2>
        {floatAllocations.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No allocation activity yet.</p>
        ) : (
          <div className="space-y-2">
            {floatAllocations.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {rec.direction === "ALLOCATE" ? (
                    <ArrowUpFromLine className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowDownToLine className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {rec.direction === "ALLOCATE" ? "Allocated to" : "Reclaimed from"} {rec.subAgentName}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {new Date(rec.timestamp).toLocaleString()} {rec.note ? `• ${rec.note}` : ""}
                    </div>
                  </div>
                </div>
                <div className="font-mono font-bold text-white shrink-0">
                  {rec.currency === "XOF" ? "CFA" : "₦"}{rec.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Allocate / Reclaim Modal */}
      {modalMode && activeSubAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#0d1424] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">
                {modalMode === "ALLOCATE" ? "Allocate Float" : "Reclaim Float"}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {modalMode === "ALLOCATE"
                ? `Move float from your wallet (₦${liquidity.walletFloat.toLocaleString()} available) into ${activeSubAgent.agentName}'s wallet.`
                : `Pull float back from ${activeSubAgent.agentName} (${activeSubAgent.currency === "XOF" ? "CFA" : "₦"}${activeSubAgent.walletFloat.toLocaleString()} available) into your own wallet.`}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount</label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Weekly replenishment"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[#090f1e] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-xl text-slate-950 text-xs font-bold transition-colors ${
                  modalMode === "ALLOCATE"
                    ? "bg-emerald-500 hover:bg-emerald-400"
                    : "bg-amber-500 hover:bg-amber-400"
                } disabled:opacity-60`}
              >
                {isSubmitting
                  ? "Processing..."
                  : modalMode === "ALLOCATE"
                  ? "Confirm Allocation"
                  : "Confirm Reclaim"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
