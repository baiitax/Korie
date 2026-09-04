"use client";

import React, { useState } from "react";
import { useAdmin } from "./AdminContext";
import {
  X,
  Building2,
  Users,
  Repeat2,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Lock,
  ArrowRight,
  Send,
  FileText,
  Layers,
  Database,
  Smartphone,
  MapPin,
  Coins,
} from "lucide-react";
import { Transaction, Customer, Agent, Merchant, BDCOperator, ReconciliationException } from "@/types/admin";

export const EntityDrawer: React.FC = () => {
  const { activeDrawer, closeDrawer, openMakerChecker } = useAdmin();
  const [activeTab, setActiveTab] = useState<"summary" | "timeline" | "ledger" | "risk" | "audit">("summary");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!activeDrawer) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderTransactionDetail = (tx: Transaction) => {
    return (
      <div className="space-y-6">
        {/* Status Header */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Gross Amount</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">
              {tx.currency === "NGN" ? "₦" : "CFA "}
              {tx.amount.toLocaleString()}
            </div>
            {tx.destinationAmount && (
              <div className="text-xs font-mono text-amber-400 mt-0.5">
                ≈ {tx.destinationCurrency} {tx.destinationAmount.toLocaleString()} (@ {tx.exchangeRate})
              </div>
            )}
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                tx.status === "SUCCESSFUL"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : tx.status === "FAILED"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              ● {tx.status}
            </span>
            <div className="text-[10px] font-mono text-slate-400 mt-1">Fee: {tx.currency} {tx.fee}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 text-xs font-semibold">
          {(["summary", "timeline", "ledger", "risk"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 capitalize transition-all border-b-2 ${
                activeTab === tab
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Summary */}
        {activeTab === "summary" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Reference</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-white font-semibold">{tx.reference}</span>
                  <button onClick={() => handleCopy(tx.reference, "ref")}>
                    {copiedKey === "ref" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Provider Ref</span>
                <span className="font-mono text-slate-200">{tx.providerReference || "Awaiting Node"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Channel</span>
                <span className="text-slate-200">{tx.channel}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Banking Node</span>
                <span className="text-emerald-400 font-semibold">{tx.provider.name}</span>
              </div>
            </div>

            {/* Sender & Recipient Box */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono">Originating Entity (Sender)</span>
                <div className="text-white font-bold">{tx.sender.name}</div>
                <div className="text-slate-400 text-[11px] font-mono">{tx.sender.accountNumber} • {tx.sender.bankName}</div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-slate-400 text-[10px] uppercase font-mono">Beneficiary (Recipient)</span>
                <div className="text-white font-bold">{tx.recipient.name}</div>
                <div className="text-slate-400 text-[11px] font-mono">{tx.recipient.accountNumber} • {tx.recipient.bankName}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-3">
            {tx.timeline.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <div className="mt-0.5">
                  {step.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : step.status === "FAILED" ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">{step.step}</div>
                  {step.detail && <div className="text-[11px] text-red-300 mt-0.5">{step.detail}</div>}
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Ledger */}
        {activeTab === "ledger" && (
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
              <div className="flex justify-between text-slate-400 text-[10px] font-mono uppercase mb-1">
                <span>Account</span>
                <span>Type</span>
                <span>Amount</span>
              </div>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-200">
                  <span>Sender Wallet</span>
                  <span className="text-red-400 font-bold">DEBIT</span>
                  <span>-₦{tx.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>Providus Clearing</span>
                  <span className="text-emerald-400 font-bold">CREDIT</span>
                  <span>+₦{tx.netAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-200">
                  <span>KoriePay Fee Revenue</span>
                  <span className="text-emerald-400 font-bold">CREDIT</span>
                  <span>+₦{tx.fee.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Risk */}
        {activeTab === "risk" && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono">Heuristic Risk Score</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{tx.riskScore} / 100</div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {tx.riskLevel} RISK
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span>Origin IP:</span>
                <span className="font-mono text-white">{tx.ipAddress || "Internal System"}</span>
              </div>
              <div className="flex justify-between">
                <span>Device Signature:</span>
                <span className="font-mono text-white">{tx.deviceSignature || "Authenticated Session"}</span>
              </div>
              <div className="flex justify-between">
                <span>AML Watchlist Match:</span>
                <span className="text-emerald-400 font-semibold">{tx.isFlaggedForAML ? "FLAGGED" : "CLEAR"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCustomerDetail = (cust: Customer) => {
    return (
      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white">{cust.fullName}</div>
            <div className="text-xs text-slate-400">{cust.email} • {cust.phone}</div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {cust.kycTier}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-slate-400 text-[10px] font-mono uppercase">Available Balance</span>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {cust.currency === "NGN" ? "₦" : "CFA "}
              {cust.availableBalance.toLocaleString()}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-slate-400 text-[10px] font-mono uppercase">30D Volume</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {cust.currency === "NGN" ? "₦" : "CFA "}
              {cust.totalVolume.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex gap-2">
          <button
            onClick={() => {
              openMakerChecker({
                id: `mc-freeze-${Date.now()}`,
                actionType: "WALLET_FREEZE",
                resourceType: "CUSTOMER_WALLET",
                resourceId: cust.walletId,
                resourceName: cust.fullName,
                countryCode: cust.countryCode,
                requestedBy: "super.admin@koriepay.com",
                requestedAt: new Date().toISOString(),
                reason: "Administrative hold pending KYC re-verification",
                payload: { customerId: cust.id, walletId: cust.walletId },
                status: "PENDING",
              });
            }}
            className="flex-1 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition-colors"
          >
            Freeze Wallet (Dual Control)
          </button>
        </div>
      </div>
    );
  };

  const renderAgentDetail = (agent: Agent) => {
    return (
      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white">{agent.businessName}</div>
            <div className="text-xs text-slate-400">{agent.agentName} • {agent.stateOrRegion}</div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {agent.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-slate-400 text-[10px] font-mono uppercase">Float Balance</span>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {agent.currency === "NGN" ? "₦" : "CFA "}
              {agent.floatBalance.toLocaleString()}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-slate-400 text-[10px] font-mono uppercase">24h Commission</span>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
              {agent.currency === "NGN" ? "₦" : "CFA "}
              {agent.commissionEarned24h.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs space-y-2 text-slate-300">
          <div className="flex justify-between">
            <span>Active Smart POS Terminal:</span>
            <span className="font-mono text-emerald-400">{agent.activeTerminalId}</span>
          </div>
          <div className="flex justify-between">
            <span>30D Transaction Count:</span>
            <span className="font-mono text-white">{agent.transactionCount30d.toLocaleString()} tx</span>
          </div>
          <div className="flex justify-between">
            <span>Success Rate:</span>
            <span className="font-mono text-emerald-400 font-bold">{agent.successRate}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div
        className="relative w-full max-w-xl bg-[#0b1222] border-l border-white/15 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Drawer Top Bar */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {activeDrawer.type} INSPECTOR
              </span>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dynamic Entity Content */}
          {activeDrawer.type === "TRANSACTION" && renderTransactionDetail(activeDrawer.data as Transaction)}
          {activeDrawer.type === "CUSTOMER" && renderCustomerDetail(activeDrawer.data as Customer)}
          {activeDrawer.type === "AGENT" && renderAgentDetail(activeDrawer.data as Agent)}
        </div>

        {/* Drawer Bottom Actions */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>KoriePay Command Center Telemetry</span>
          <button
            onClick={closeDrawer}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntityDrawer;
