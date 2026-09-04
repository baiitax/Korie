"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { formatMoney } from "@/services/customerDataService";
import {
  ArrowLeft,
  Wallet,
  PlusCircle,
  Copy,
  Check,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export default function CustomerWalletsPage() {
  const { wallets, activeWallet, setActiveCurrency, t } = useCustomer();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            {t("nav.wallet")}
          </h1>
          <p className="text-xs text-slate-400">
            Multi-currency treasury vaults across Nigeria and Niger Republic.
          </p>
        </div>
      </div>

      {/* Wallets Cards List */}
      <div className="space-y-4">
        {wallets.map((w) => (
          <div
            key={w.id}
            className="rounded-3xl bg-gradient-to-br from-[#0c162b] to-[#070e1b] border border-white/15 p-6 space-y-4 shadow-xl"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {w.currency === "NGN" ? "🇳🇬" : w.currency === "XOF" ? "🇳🇪" : "🇺🇸"}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{w.bankName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {w.currency} Primary Vault
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ● ACTIVE
              </span>
            </div>

            {/* Balances */}
            <div className="space-y-1 pt-1">
              <div className="text-[10px] font-mono uppercase text-slate-400">
                {t("dashboard.availableBalance")}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {formatMoney(w.availableBalance, w.currency)}
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span>Ledger: {formatMoney(w.ledgerBalance, w.currency)}</span>
                <span>•</span>
                <span className="text-emerald-400">Daily Limit: {formatMoney(w.dailyLimit, w.currency)}</span>
              </div>
            </div>

            {/* Virtual Account Strip */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  NUBAN / IBAN
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {w.accountNumber}
                </div>
                <div className="text-[11px] text-slate-300">{w.accountName}</div>
              </div>

              <button
                onClick={() => handleCopy(w.accountNumber, w.id)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Copy Number"
              >
                {copiedId === w.id ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/customer/send-money"
                onClick={() => setActiveCurrency(w.currency)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs text-center transition-colors shadow-md shadow-emerald-500/20"
              >
                Send Money
              </Link>
              <Link
                href="/customer/receive-money"
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs text-center border border-white/10 transition-colors"
              >
                Receive Funds
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
