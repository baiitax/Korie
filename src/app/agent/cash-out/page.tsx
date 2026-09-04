"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { BANK_DIRECTORY } from "@/services/customerDataService";
import {
  ArrowLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Building2,
  Fingerprint,
  CreditCard,
  Lock,
} from "lucide-react";

export default function AgentCashOutPage() {
  const { liquidity, executeCashOut, openReceipt, t } = useAgent();

  const [bankCode, setBankCode] = useState("058");
  const [accountNumber, setAccountNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [amount, setAmount] = useState("20000");
  const [authMethod, setAuthMethod] = useState<"CARD_PIN" | "BIOMETRIC" | "OTP">("CARD_PIN");

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const selectedBank = BANK_DIRECTORY.find((b) => b.code === bankCode) || BANK_DIRECTORY[0];
  const parsedAmount = parseFloat(amount) || 0;
  const customerFee = 100;
  const totalDebit = parsedAmount + customerFee;
  const agentCommission = 25;

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
          setCustomerName("Kano Central Retail Customer");
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

    const result = await executeCashOut({
      customerName,
      customerAccount: accountNumber,
      customerBank: selectedBank.name,
      amount: parsedAmount,
    });

    setIsExecuting(false);

    if (result.success && result.transaction) {
      openReceipt(result.transaction);
      setAccountNumber("");
      setCustomerName("");
      setAmount("");
    } else {
      setExecutionError(result.error || "Cash-Out failed.");
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
            {t("cashOut.title")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("cashOut.subtitle")}
          </p>
        </div>
      </div>

      {/* Strict Cash Release Warning Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">CRITICAL CASH RELEASE PROTOCOL</div>
          <p className="mt-0.5 text-amber-200/90 leading-relaxed">
            {t("cashOut.releaseCashWarning")}
          </p>
        </div>
      </div>

      {/* Float Availability Banner */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between text-xs font-mono">
        <div>
          <div className="text-slate-400 uppercase text-[10px]">Physical Cash Available to Dispense</div>
          <div className="text-base font-extrabold text-white">
            ₦{liquidity.cashInHand.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 uppercase text-[10px]">Wallet Float Balance</div>
          <div className="text-base font-extrabold text-emerald-400">
            ₦{liquidity.walletFloat.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Cash-Out Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 sm:p-6 space-y-5 shadow-xl text-xs">
        {/* Destination Bank */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">Customer Source Bank</label>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
          <label className="font-semibold text-slate-300">{t("cashOut.customerAccount")}</label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={10}
              placeholder="10-digit NUBAN / IBAN"
              value={accountNumber}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            {isVerifying && (
              <span className="absolute right-3.5 top-3.5 text-xs text-amber-400 font-mono animate-pulse">
                Verifying...
              </span>
            )}
          </div>

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

        {/* Authorization Method */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">Authorization Rail</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "CARD_PIN", label: "Smart POS Chip", icon: CreditCard },
              { id: "BIOMETRIC", label: "Biometric Auth", icon: Fingerprint },
              { id: "OTP", label: "Customer OTP", icon: Lock },
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = authMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setAuthMethod(method.id as typeof authMethod)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                      : "bg-white/[0.02] border-white/5 text-slate-400"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount to Withdraw */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-300">{t("cashOut.amountToWithdraw")} (₦)</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono">
            {["5000", "10000", "20000", "50000", "100000"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-colors ${
                  amount === preset
                    ? "bg-amber-500 text-slate-950"
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
            className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-lg font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Financial Breakdown Card */}
        {parsedAmount > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2 font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>Dispense to Customer:</span>
              <span className="text-white font-bold">₦{parsedAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Customer Convenience Fee:</span>
              <span className="text-slate-200">₦{customerFee}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-400 font-bold border-t border-white/5 pt-2">
              <span>Agent Commission Earned:</span>
              <span>+₦{agentCommission}</span>
            </div>
            <div className="flex items-center justify-between text-white font-bold bg-white/[0.02] p-2 rounded-xl">
              <span>Total Customer Debit:</span>
              <span className="text-amber-400 text-sm">₦{totalDebit.toLocaleString()}</span>
            </div>
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
          disabled={isExecuting || !customerName || parsedAmount <= 0}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-amber-500/20"
        >
          {isExecuting ? "Authorizing Debit..." : t("cashOut.confirmDebitBtn")}
        </button>
      </form>
    </div>
  );
}
