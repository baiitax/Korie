"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { LiquidityAmount } from "@/components/agent/ui/LiquidityAmount";
import { BANK_DIRECTORY } from "@/services/customerDataService";
import {
  ArrowLeft,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Coins,
  ShieldCheck,
  User,
} from "lucide-react";

export default function AgentCashInPage() {
  const { liquidity, isLiquidityLoading, executeCashIn, openReceipt, t } = useAgent();

  const [bankCode, setBankCode] = useState("058");
  const [accountNumber, setAccountNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [amount, setAmount] = useState("50000");

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const selectedBank = BANK_DIRECTORY.find((b) => b.code === bankCode) || BANK_DIRECTORY[0];
  const parsedAmount = parseFloat(amount) || 0;
  const commission = parsedAmount > 0 ? (parsedAmount >= 50000 ? 35 : 20) : 0;

  const handleAccountChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(cleaned);

    if (cleaned.length === 10) {
      setIsVerifying(true);
      setTimeout(() => {
        setIsVerifying(false);
        if (cleaned === "0142981891") {
          setCustomerName("Aisha Mohammed");
        } else if (cleaned === "2019481203") {
          setCustomerName("Aliyu Harouna");
        } else {
          setCustomerName("Dawanau Commercial Hub Customer");
        }
      }, 400);
    } else {
      setCustomerName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || parsedAmount <= 0) return;

    setIsExecuting(true);
    setExecutionError(null);

    const result = await executeCashIn({
      customerName,
      customerAccount: accountNumber,
      customerBank: selectedBank.name,
      customerPhone,
      amount: parsedAmount,
    });

    setIsExecuting(false);

    if (result.success && result.transaction) {
      openReceipt(result.transaction);
      setAccountNumber("");
      setCustomerName("");
      setAmount("");
    } else {
      setExecutionError(result.error || "Cash-In failed.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/agent"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("cashIn.title")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("cashIn.subtitle")}
          </p>
        </div>
      </div>

      {/* Float Availability Banner */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between text-xs font-mono">
        <div>
          <div className="text-slate-400 uppercase text-[10px]">Available Wallet Float</div>
          <div className="text-base font-extrabold text-emerald-400">
            <LiquidityAmount value={`₦${liquidity.walletFloat.toLocaleString()}`} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 uppercase text-[10px]">Physical Cash In Hand</div>
          <div className="text-base font-extrabold text-white">
            <LiquidityAmount value={`₦${liquidity.cashInHand.toLocaleString()}`} />
          </div>
        </div>
      </div>

      {/* Cash-In Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 sm:p-6 space-y-5 shadow-xl text-xs">
        {/* Destination Bank */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">{t("cashIn.selectBank")}</label>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {BANK_DIRECTORY.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name} ({bank.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Customer Account Number */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">{t("cashIn.customerAccount")}</label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={10}
              placeholder="10-digit NUBAN / IBAN"
              value={accountNumber}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {isVerifying && (
              <span className="absolute right-3.5 top-3.5 text-xs text-emerald-400 font-mono animate-pulse">
                Verifying...
              </span>
            )}
          </div>

          {/* Verified Customer Name Banner */}
          {customerName && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{customerName}</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">
                {selectedBank.name}
              </span>
            </div>
          )}
        </div>

        {/* Customer Phone (Optional) */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">Customer Phone Number (For SMS Slip)</label>
          <input
            type="tel"
            placeholder="+234 803 000 0000"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono placeholder:text-slate-600"
          />
        </div>

        {/* Amount to Deposit */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-300">{t("cashIn.cashAmount")} (₦)</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono">
            {["10000", "20000", "50000", "100000", "200000"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-colors ${
                  amount === preset
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                ₦{parseInt(preset).toLocaleString()}
              </button>
            ))}
          </div>

          <input
            type="number"
            min="100"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-lg font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Commission Note */}
        {parsedAmount > 0 && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between font-mono">
            <span>Agent Commission:</span>
            <span className="font-bold text-sm text-emerald-400">+₦{commission}</span>
          </div>
        )}

        {executionError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{executionError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isExecuting || isLiquidityLoading || !customerName || parsedAmount <= 0}
          className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20"
        >
          {isExecuting ? "Processing Cash-In..." : t("cashIn.confirmDepositBtn")}
        </button>
      </form>
    </div>
  );
}
