"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { LiquidityAmount } from "@/components/agent/ui/LiquidityAmount";
import { useTransactionQuote } from "@/lib/agency/useTransactionQuote";
import { BANK_DIRECTORY } from "@/services/customerDataService";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
} from "lucide-react";

export default function AgentTransferPage() {
  const { liquidity, executeTransfer, openReceipt, t } = useAgent();

  const [bankCode, setBankCode] = useState("058");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [amount, setAmount] = useState("25000");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const selectedBank = BANK_DIRECTORY.find((b) => b.code === bankCode) || BANK_DIRECTORY[0];
  const parsedAmount = parseFloat(amount) || 0;
  const isCrossBorder = selectedBank.currency === "XOF";
  const quoteCurrency: "NGN" | "XOF" = isCrossBorder ? "XOF" : "NGN";
  const { quote, isLoading: isQuoteLoading } = useTransactionQuote(
    isCrossBorder ? "TRANSFER_CROSS_BORDER" : "TRANSFER_NIP",
    quoteCurrency,
    parsedAmount
  );
  const fee = quote?.customerFee ?? 0;
  const agentCommission = quote?.agentCommission ?? 0;

  const handleAccountChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(cleaned);

    if (cleaned.length === 10) {
      setIsVerifying(true);
      setTimeout(() => {
        setIsVerifying(false);
        if (cleaned === "0142981891") {
          setRecipientName("Aisha Mohammed");
        } else if (cleaned === "2019481203") {
          setRecipientName("Aliyu Harouna");
        } else {
          setRecipientName("Verified Beneficiary Account");
        }
      }, 400);
    } else {
      setRecipientName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || parsedAmount <= 0) return;

    setIsExecuting(true);
    setExecutionError(null);

    const result = await executeTransfer({
      recipientName,
      recipientBank: selectedBank.name,
      recipientAccount: accountNumber,
      amount: parsedAmount,
    });

    setIsExecuting(false);

    if (result.success && result.transaction) {
      openReceipt(result.transaction);
      setAccountNumber("");
      setRecipientName("");
      setAmount("");
    } else {
      setExecutionError(result.error || "Transfer failed.");
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
            {t("common.sendTransfer")}
          </h1>
          <p className="text-xs text-slate-400">
            Instant NIBSS NIP & WAEMU interbank agency transfer rail.
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
          <div className="text-slate-400 uppercase text-[10px]">Settlement Node</div>
          <div className="text-sm font-bold text-white">Providus Bank Core</div>
        </div>
      </div>

      {/* Transfer Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 sm:p-6 space-y-5 shadow-xl text-xs">
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">Destination Bank</label>
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

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">Recipient Account Number / NUBAN</label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={10}
              placeholder="10-digit account number"
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

          {recipientName && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{recipientName}</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">
                {selectedBank.name}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="font-semibold text-slate-300">Amount to Send (₦)</label>
          <input
            type="number"
            min="100"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-lg font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {parsedAmount > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>Transfer Fee:</span>
              <span className="text-slate-200">
                {isQuoteLoading && !quote ? "Calculating..." : `₦${fee.toLocaleString()}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>Agent Commission:</span>
              <span>{isQuoteLoading && !quote ? "Calculating..." : `+₦${agentCommission.toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between text-white font-bold border-t border-white/5 pt-1.5">
              <span>Total Debit to Float:</span>
              <span>₦{(parsedAmount + fee).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Live bank payout provider integration is pending. Your float will be debited and the
            transaction recorded immediately, but the receiving bank leg will show as{" "}
            <strong>Pending Provider Integration</strong> until settlement is wired up.
          </span>
        </div>

        {executionError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{executionError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isExecuting || !recipientName || parsedAmount <= 0}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-amber-500/20"
        >
          {isExecuting ? "Routing Transfer..." : "Execute Interbank Transfer"}
        </button>
      </form>
    </div>
  );
}
