"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Building2,
  QrCode,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function ReceiveMoneyPage() {
  const { customer, wallets, t } = useCustomer();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (wallet: (typeof wallets)[0]) => {
    const text = `My KoriePay Account Details:\nBank: ${wallet.bankName}\nAccount Number: ${wallet.accountNumber}\nName: ${wallet.accountName}\nCurrency: ${wallet.currency}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "KoriePay Account Details",
          text,
        });
      } catch {
        handleCopy(wallet.accountNumber, wallet.id);
      }
    } else {
      handleCopy(wallet.accountNumber, wallet.id);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("receive.title")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("receive.subtitle")}
          </p>
        </div>
      </div>

      {/* QR Code Presentation Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c162b] to-[#070d1a] border border-white/15 p-6 text-center space-y-4 shadow-2xl">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
            {t("receive.qrTitle")}
          </span>
          <p className="text-xs text-slate-300">
            {t("receive.qrSubtitle")}
          </p>
        </div>

        {/* Dynamic Stylized QR Code */}
        <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto shadow-2xl flex flex-col items-center justify-center relative">
          <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950">
            {/* SVG stylized QR pattern */}
            <rect x="5" y="5" width="30" height="30" rx="4" fill="currentColor" />
            <rect x="10" y="10" width="20" height="20" rx="2" fill="white" />
            <rect x="15" y="15" width="10" height="10" fill="currentColor" />

            <rect x="65" y="5" width="30" height="30" rx="4" fill="currentColor" />
            <rect x="70" y="10" width="20" height="20" rx="2" fill="white" />
            <rect x="75" y="15" width="10" height="10" fill="currentColor" />

            <rect x="5" y="65" width="30" height="30" rx="4" fill="currentColor" />
            <rect x="10" y="70" width="20" height="20" rx="2" fill="white" />
            <rect x="15" y="75" width="10" height="10" fill="currentColor" />

            {/* Random stylized QR data blocks */}
            <rect x="42" y="10" width="16" height="8" fill="currentColor" />
            <rect x="42" y="24" width="8" height="18" fill="currentColor" />
            <rect x="54" y="24" width="6" height="8" fill="currentColor" />
            <rect x="10" y="42" width="18" height="8" fill="currentColor" />
            <rect x="35" y="45" width="30" height="10" rx="2" fill="#10b981" />
            <rect x="75" y="42" width="15" height="18" fill="currentColor" />
            <rect x="42" y="62" width="18" height="12" fill="currentColor" />
            <rect x="65" y="65" width="10" height="25" fill="currentColor" />
            <rect x="80" y="75" width="15" height="15" fill="currentColor" />
          </svg>
        </div>

        <div className="text-xs font-bold text-white font-mono">
          @{customer.email.split("@")[0]} • KoriePay
        </div>
      </div>

      {/* Multi-Currency Account List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
          Dedicated Banking Numbers
        </h2>

        {wallets.map((w) => (
          <div
            key={w.id}
            className="rounded-3xl bg-[#090f1d] border border-white/10 p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {w.currency === "NGN" ? "🇳🇬" : w.currency === "XOF" ? "🇳🇪" : "🇺🇸"}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{w.bankName}</div>
                  <div className="text-[10px] text-slate-400">{w.currency} Account</div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                ● Active 24/7
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-mono text-slate-400">
                  {t("receive.accountNumber")}
                </div>
                <div className="text-base sm:text-lg font-extrabold text-white font-mono tracking-wider">
                  {w.accountNumber}
                </div>
                <div className="text-[11px] text-slate-300">{w.accountName}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(w.accountNumber, w.id)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Copy Account Number"
                >
                  {copiedId === w.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleShare(w)}
                  className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                  title="Share Details"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Instant Settlement Note */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-3">
        <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>{t("receive.instantCreditNote")}</span>
      </div>
    </div>
  );
}
