"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import PinModal from "@/components/customer/ui/PinModal";
import { formatMoney } from "@/lib/money";
import { ArrowLeft, QrCode, CheckCircle2, Zap } from "lucide-react";

export default function CustomerPaymentsPage() {
  const { activeWallet, executeTransfer, t } = useCustomer();
  const [merchantCode, setMerchantCode] = useState("MCH-SAHARA-001");
  const [amount, setAmount] = useState("4500");
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const handlePay = (e: React.FormEvent) => { e.preventDefault(); setIsPinOpen(true); };

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
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            {t("nav.payments")} {t("customer.payments.titleQr")}
          </h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("customer.payments.subtitle")}</p>
        </div>
      </div>

      {isPaid ? (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--brand-border)] p-8 text-center space-y-5 shadow-[var(--shadow-card)] animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight">{t("customer.payments.confirmed")}</h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              {t("customer.payments.confirmedDesc", { amount: formatMoney(parseFloat(amount), activeWallet.currency), merchant: "Sahara Wholesale Supermarket" })}
            </p>
          </div>
          <button onClick={() => setIsPaid(false)} className="w-full py-3.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs shadow-[var(--shadow-md)]">
            {t("customer.payments.done")}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Camera Scanner Simulation */}
          <div className="rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border)] p-6 text-center space-y-3 relative overflow-hidden">
            <div className="w-40 h-40 border-2 border-dashed border-[var(--brand-border)] rounded-3xl mx-auto flex flex-col items-center justify-center bg-[var(--brand-soft)] relative">
              <QrCode className="w-12 h-12 text-[var(--brand-primary)] animate-pulse" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[var(--brand-primary)] animate-bounce" />
            </div>
            <p className="text-xs text-[var(--foreground)] font-semibold">{t("customer.payments.scanTitle")}</p>
          </div>

          {/* Or Manual Store Entry */}
          <form onSubmit={handlePay} className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--foreground)]">{t("customer.payments.merchantCode")}</label>
              <input type="text" required value={merchantCode} onChange={(e) => setMerchantCode(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--foreground)]">{t("customer.payments.amount")} ({activeWallet.currency})</label>
              <input type="number" min="100" required value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-mono text-lg font-bold focus:outline-none" />
            </div>
            <button type="submit" className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-extrabold text-sm transition-all shadow-[var(--shadow-md)]">
              {t("customer.payments.payNow")}
            </button>
          </form>
        </div>
      )}

      <PinModal isOpen={isPinOpen} onClose={() => setIsPinOpen(false)} onSuccess={handleConfirmPin} />
    </div>
  );
}
