"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import PinModal from "@/components/customer/ui/PinModal";
import { formatMoney } from "@/services/customerDataService";
import {
  ArrowLeft,
  QrCode,
  Store,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function CustomerPaymentsPage() {
  const { activeWallet, executeTransfer, t } = useCustomer();
  const [merchantCode, setMerchantCode] = useState("MCH-SAHARA-001");
  const [amount, setAmount] = useState("4500");
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPinOpen(true);
  };

  const handleConfirmPin = async (pin: string) => {
    setIsPinOpen(false);
    const parsed = parseFloat(amount) || 0;
    await executeTransfer({
      recipientName: "Sahara Wholesale Supermarket",
      recipientBank: "Providus Merchant Settlement",
      recipientAccount: "0123991823",
      amount: parsed,
      currency: activeWallet.currency,
      description: "In-store QR checkout payment",
    });
    setIsPaid(true);
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
            {t("nav.payments")} & QR Pay
          </h1>
          <p className="text-xs text-slate-400">
            Scan and pay merchant standees or enter merchant store code.
          </p>
        </div>
      </div>

      {isPaid ? (
        <div className="rounded-3xl bg-[#091122] border border-emerald-500/30 p-8 text-center space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white">Payment Confirmed</h2>
            <p className="text-xs text-slate-300">
              Paid {formatMoney(parseFloat(amount), activeWallet.currency)} to Sahara Wholesale Supermarket.
            </p>
          </div>
          <button
            onClick={() => setIsPaid(false)}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Camera Scanner Simulation */}
          <div className="rounded-3xl bg-slate-950 border border-white/10 p-6 text-center space-y-3 relative overflow-hidden">
            <div className="w-40 h-40 border-2 border-dashed border-emerald-500/60 rounded-3xl mx-auto flex flex-col items-center justify-center bg-emerald-500/5 relative">
              <QrCode className="w-12 h-12 text-emerald-400 animate-pulse" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400 shadow-glow-green animate-bounce" />
            </div>
            <p className="text-xs text-slate-300 font-semibold">
              Point camera at any KoriePay Merchant QR Standee
            </p>
          </div>

          {/* Or Manual Store Entry */}
          <form onSubmit={handlePay} className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Merchant Store Code</label>
              <input
                type="text"
                required
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Amount ({activeWallet.currency})
              </label>
              <input
                type="number"
                min="100"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-lg font-bold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20"
            >
              Pay Merchant Now
            </button>
          </form>
        </div>
      )}

      <PinModal
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        onSuccess={handleConfirmPin}
      />
    </div>
  );
}
