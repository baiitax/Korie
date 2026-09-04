"use client";

import React, { useState } from "react";
import { useMerchant } from "../MerchantContext";
import {
  X,
  QrCode,
  Building2,
  Copy,
  Check,
  Share2,
  RefreshCw,
  Smartphone,
  CreditCard,
  Send,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export const ReceivePaymentModal: React.FC = () => {
  const { isReceiveModalOpen, setIsReceiveModalOpen, merchant, formatCurrency, branches, selectedBranchId } =
    useMerchant();

  const [activeTab, setActiveTab] = useState<"qr" | "transfer" | "sms">("transfer");
  const [amount, setAmount] = useState<string>("15000");
  const [customerPhone, setCustomerPhone] = useState<string>("+2348039281734");
  const [customerName, setCustomerName] = useState<string>("Alhaji Danladi");
  const [description, setDescription] = useState<string>("In-Store Agro Store Purchases");
  const [copied, setCopied] = useState<boolean>(false);
  const [paymentSimulated, setPaymentSimulated] = useState<boolean>(false);

  if (!isReceiveModalOpen) return null;

  const currentBranch =
    branches.find((b) => b.id === selectedBranchId) || branches[0] || {
      branchName: "Victoria Island Superstore",
      virtualNuban: "9928193820",
    };

  const virtualNuban = currentBranch.virtualNuban || "9928193820";
  const virtualBank = "Providus Bank";
  const accountTitle = `KORIE / ${merchant.tradingName.toUpperCase()} / CASHIER-1`;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulateCustomerPayment = () => {
    setPaymentSimulated(true);
    setTimeout(() => {
      setPaymentSimulated(false);
      setIsReceiveModalOpen(false);
    }, 2200);
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
            onClick={() => setIsReceiveModalOpen(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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

          {/* Tab Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/5 mt-4">
            <button
              onClick={() => setActiveTab("transfer")}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "transfer"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Dynamic Transfer</span>
            </button>
            <button
              onClick={() => setActiveTab("qr")}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "qr"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Standee</span>
            </button>
            <button
              onClick={() => setActiveTab("sms")}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "sms"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>WhatsApp/SMS</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {paymentSimulated ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h4 className="text-xl font-bold text-white">Payment Received!</h4>
              <p className="text-sm text-slate-400 font-mono">
                {formatCurrency(Number(amount) || 0)} credited to Merchant Settlement Ledger.
              </p>
            </div>
          ) : activeTab === "transfer" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#131f3b] to-[#0d162a] border border-teal-500/30 text-center space-y-2">
                <div className="text-[10px] font-mono uppercase text-teal-400 tracking-wider">
                  Customer Instant Bank Transfer
                </div>
                <div className="text-3xl font-black text-white font-mono tracking-widest">{virtualNuban}</div>
                <div className="text-xs text-slate-300 font-medium">
                  {virtualBank} • <span className="font-mono text-slate-400">{accountTitle}</span>
                </div>
                <button
                  onClick={() => handleCopy(`${virtualNuban} - ${virtualBank}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold mt-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied to Clipboard" : "Copy Account Details"}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Store Terminal:</span>
                  <span className="text-white font-medium">{currentBranch.branchName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Settlement Route:</span>
                  <span className="text-teal-400 font-mono">Providus Instant Autocredit</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Expected Settlement:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {formatCurrency(Number(amount) * 0.985 || 0)} (1.5% fee)
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === "qr" ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl inline-block shadow-xl border-4 border-teal-500">
                {/* Embedded SVG QR representation */}
                <svg className="w-48 h-48" viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" fill="white" />
                  <path
                    d="M10 10h30v30h-30zM15 15h20v20h-20zM60 10h30v30h-30zM65 15h20v20h-20zM10 60h30v30h-30zM15 65h20v20h-20z"
                    fill="#0A1128"
                  />
                  <rect x="20" y="20" width="10" height="10" fill="#0D9488" />
                  <rect x="70" y="20" width="10" height="10" fill="#0D9488" />
                  <rect x="20" y="70" width="10" height="10" fill="#0D9488" />
                  <rect x="45" y="15" width="10" height="10" fill="#0A1128" />
                  <rect x="45" y="35" width="10" height="10" fill="#0A1128" />
                  <rect x="45" y="55" width="10" height="10" fill="#0D9488" />
                  <rect x="45" y="75" width="10" height="10" fill="#0A1128" />
                  <rect x="65" y="55" width="10" height="10" fill="#0A1128" />
                  <rect x="75" y="65" width="15" height="10" fill="#0A1128" />
                  <rect x="65" y="75" width="10" height="15" fill="#0D9488" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">
                Customer scans with KoriePay App, OPay, PalmPay, or any NIBSS QR Banking App.
              </p>
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
              <p className="text-[11px] text-teal-400/90 font-mono">
                An instant secure payment checkout link will be dispatched via SMS & WhatsApp.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-[#080d1a] border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={() => setIsReceiveModalOpen(false)}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={simulateCustomerPayment}
            className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirm In-Store Cashier Received</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceivePaymentModal;
