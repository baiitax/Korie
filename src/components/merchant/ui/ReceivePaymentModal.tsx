"use client";

import React, { useState } from "react";
import { useMerchant } from "../MerchantContext";
import { merchantApiFetch } from "@/lib/merchant/merchantSession";
import {
  X,
  QrCode,
  Building2,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export const ReceivePaymentModal: React.FC = () => {
  const { isReceiveModalOpen, setIsReceiveModalOpen, merchant, formatCurrency, branches, selectedBranchId, refreshAll } =
    useMerchant();

  const [activeTab, setActiveTab] = useState<"qr" | "transfer" | "sms">("transfer");
  const [amount, setAmount] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const [stage, setStage] = useState<"FORM" | "AWAITING" | "CONFIRMED" | "ERROR">("FORM");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionReference, setCollectionReference] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isReceiveModalOpen) return null;

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const virtualNuban = currentBranch?.virtualNuban || null;
  const virtualBank = "Providus Bank";
  const accountTitle = `KORIE / ${merchant.tradingName.toUpperCase()} / CASHIER-1`;

  const handleClose = () => {
    setIsReceiveModalOpen(false);
    setStage("FORM");
    setAmount("");
    setCustomerName("");
    setCustomerPhone("");
    setCollectionId(null);
    setErrorMessage(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCollection = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Enter a valid collection amount.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await merchantApiFetch("/api/v1/merchant/collections", {
        method: "POST",
        body: JSON.stringify({
          amount: parsedAmount,
          currency: merchant.currency,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          branchId: selectedBranchId,
          channel: activeTab === "transfer" ? "TRANSFER" : activeTab === "qr" ? "QR" : "SMS",
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        setErrorMessage(json?.error?.message || "Could not create collection request.");
        setIsSubmitting(false);
        return;
      }
      setCollectionId(json.data.id);
      setCollectionReference(json.data.reference);
      setStage("AWAITING");
    } catch {
      setErrorMessage("Network error creating collection request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!collectionId) return;
    setIsConfirming(true);
    setErrorMessage(null);
    try {
      const res = await merchantApiFetch(`/api/v1/merchant/collections/${collectionId}/confirm`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        setErrorMessage(json?.error?.message || "Could not confirm this collection yet.");
        setIsConfirming(false);
        return;
      }
      setStage("CONFIRMED");
      await refreshAll();
      setTimeout(() => handleClose(), 2500);
    } catch {
      setErrorMessage("Network error confirming collection.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c1324] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#080d1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">In-Store Instant Collection</h3>
              <p className="text-xs text-slate-400 font-mono">Dynamic POS & Transfer Terminal</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {stage === "FORM" && (
          <>
            {/* Amount Input */}
            <div className="p-4 sm:p-5 bg-[#0e172c] border-b border-white/5">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Collection Amount ({merchant.currency})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400 font-bold text-lg">
                  {merchant.currency === "NGN" ? "₦" : "CFA"}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/5 mt-4">
                <button
                  onClick={() => setActiveTab("transfer")}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "transfer" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Dynamic Transfer</span>
                </button>
                <button
                  onClick={() => setActiveTab("qr")}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "qr" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Standee</span>
                </button>
                <button
                  onClick={() => setActiveTab("sms")}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "sms" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>WhatsApp/SMS</span>
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {activeTab === "transfer" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#131f3b] to-[#0d162a] border border-teal-500/30 text-center space-y-2">
                    <div className="text-[10px] font-mono uppercase text-teal-400 tracking-wider">
                      Customer Instant Bank Transfer
                    </div>
                    <div className="text-3xl font-black text-white font-mono tracking-widest">
                      {virtualNuban || "Not yet provisioned"}
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {virtualBank} • <span className="font-mono text-slate-400">{accountTitle}</span>
                    </div>
                    {virtualNuban && (
                      <button
                        onClick={() => handleCopy(`${virtualNuban} - ${virtualBank}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold mt-1 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "Copied to Clipboard" : "Copy Account Details"}</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Customer Name (Optional)</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Customer Phone Number</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Customer Name (Optional)</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-[#080d1a] border-t border-white/10 flex items-center justify-between gap-3">
              <button onClick={handleClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isSubmitting ? "Creating request..." : "Generate Collection Request"}</span>
              </button>
            </div>
          </>
        )}

        {stage === "AWAITING" && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
              <div className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">Awaiting Customer Payment</div>
              <div className="text-2xl font-black text-white font-mono">{formatCurrency(Number(amount) || 0)}</div>
              <div className="text-xs text-slate-300 font-mono">Reference: {collectionReference}</div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Once you see the customer's transfer land in your bank app or terminal, confirm it below. This is
              recorded as a real pending collection until confirmed — no automatic provider webhook exists yet.
            </p>
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={handleClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors">
                Close
              </button>
              <button
                onClick={handleConfirmReceived}
                disabled={isConfirming}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isConfirming ? "Confirming..." : "Confirm Payment Received"}</span>
              </button>
            </div>
          </div>
        )}

        {stage === "CONFIRMED" && (
          <div className="py-12 text-center space-y-3 px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-xl font-bold text-white">Payment Confirmed!</h4>
            <p className="text-sm text-slate-400 font-mono">
              {formatCurrency(Number(amount) || 0)} credited to Merchant Settlement Ledger.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivePaymentModal;
