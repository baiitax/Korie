"use client";

import React, { useRef } from "react";
import { useAgent } from "../AgentContext";
import KorieLogo from "@/components/brand/KorieLogo";
import { SupportedLanguage } from "@/types/customer";
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Building2,
  Smartphone,
  QrCode,
  ShieldCheck,
} from "lucide-react";

export const AgentReceiptModal: React.FC = () => {
  const {
    isReceiptModalOpen,
    selectedReceiptTx: tx,
    closeReceipt,
    agent,
    receiptLanguage,
    setReceiptLanguage,
    t,
  } = useAgent();

  const [copiedRef, setCopiedRef] = React.useState(false);

  if (!isReceiptModalOpen || !tx) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tx.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `KoriePay Agency Receipt — ${tx.reference}`,
          text: `Official Receipt: ₦${tx.amount.toLocaleString()} ${tx.type.replace(/_/g, " ")} via Agent ${agent.agentName} (${agent.agentCode}). Ref: ${tx.reference}`,
          url: window.location.href,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#090f1e] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <KorieLogo variant="compact" theme="dark" height={22} />
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
              Agency POS Transaction Slip
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Customer Receipt Language Selector (EN / HA / FR) */}
            <select
              value={receiptLanguage}
              onChange={(e) => setReceiptLanguage(e.target.value as SupportedLanguage)}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-[11px] font-mono font-bold text-white focus:outline-none"
            >
              <option value="ha">🇳🇬 Hausa Receipt</option>
              <option value="en">🇬🇧 English Receipt</option>
              <option value="fr">🇳🇪 Français Receipt</option>
            </select>

            <button
              onClick={closeReceipt}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status & Amount */}
          {(() => {
            const isPending = tx.status === "PENDING_PROVIDER_INTEGRATION" || tx.status === "PENDING";
            const isFailed = tx.status === "FAILED" || tx.status === "REVERSED" || tx.status === "CANCELLED" || tx.status === "DISPUTED";
            const statusColor = isPending
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
              : isFailed
              ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
            const badgeColor = isPending
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : isFailed
              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
            const Icon = isPending ? Clock : isFailed ? XCircle : CheckCircle2;
            return (
              <div className="text-center space-y-1 py-1">
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center mx-auto mb-2 ${statusColor}`}>
                  <Icon className="w-7 h-7" />
                </div>

                <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
                  ₦{tx.amount.toLocaleString()}
                </div>

                <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
                  ● {tx.status.replace(/_/g, " ")}
                </div>

                {isPending && (
                  <p className="text-[11px] text-amber-400/90 font-semibold pt-1 max-w-xs mx-auto">
                    Ledger debited. Payout to the receiving bank is queued and awaiting live provider
                    settlement — this has not yet reached the beneficiary.
                  </p>
                )}

                <p className="text-xs text-slate-400 pt-1">{tx.title}</p>
              </div>
            );
          })()}

          {/* Vended Token if Electricity */}
          {tx.billerToken && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-center space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                ⚡ ELECTRICITY TOKEN (KEDCO / AEDC)
              </span>
              <div className="text-lg font-mono font-extrabold text-amber-200 select-all">
                {tx.billerToken}
              </div>
            </div>
          )}

          {/* Key Slip Fields */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 divide-y divide-white/5">
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Transaction Reference</span>
              <span className="font-mono text-emerald-400 font-bold">{tx.reference}</span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Customer Name</span>
              <span className="font-bold text-white">{tx.customerName}</span>
            </div>

            {tx.customerAccount && (
              <div className="flex items-center justify-between p-3">
                <span className="text-slate-400">Account / Bank</span>
                <span className="text-slate-200 font-mono">
                  {tx.customerBank} ({tx.customerAccount})
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Agent Business</span>
              <span className="text-white font-semibold">{agent.businessName}</span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Agent Code / Terminal</span>
              <span className="font-mono text-slate-300">
                {agent.agentCode} • {tx.terminalId}
              </span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Customer Fee</span>
              <span className="font-mono text-slate-200">₦{tx.customerFee}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-500/5">
              <span className="text-emerald-400 font-semibold">Agent Commission Earned</span>
              <span className="font-mono font-bold text-emerald-400">+₦{tx.agentCommission}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/[0.02]">
              <span className="text-white font-bold">Total Settled Amount</span>
              <span className="text-white font-bold font-mono text-sm">
                ₦{tx.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center font-mono leading-relaxed">
            Issued via KoriePay Agency Terminal Rail. Supervised by CBN & BCEAO frameworks.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-white/10 bg-slate-950/70 flex items-center justify-between gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Slip</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print POS Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentReceiptModal;
