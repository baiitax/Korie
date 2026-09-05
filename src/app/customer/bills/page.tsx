"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import PinModal from "@/components/customer/ui/PinModal";
import { BILL_PROVIDERS, DATA_PLANS_NG, formatMoney } from "@/services/customerDataService";
import { ArrowLeft, Smartphone, Flame, Tv, Wifi, CheckCircle2, AlertCircle, Zap } from "lucide-react";

export default function CustomerBillsPage() {
  const { customer, activeWallet, executeBillPayment, t } = useCustomer();
  const [activeTab, setActiveTab] = useState<"AIRTIME" | "DATA" | "ELECTRICITY" | "CABLE_TV">("AIRTIME");

  const [selectedProviderId, setSelectedProviderId] = useState("mtn-ng");
  const [phoneOrMeter, setPhoneOrMeter] = useState(customer.phone);
  const [selectedDataPlan, setSelectedDataPlan] = useState(DATA_PLANS_NG[0].id);
  const [customAmount, setCustomAmount] = useState("1000");
  const [verifiedCustomerName, setVerifiedCustomerName] = useState<string | null>(null);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [vendedResult, setVendedResult] = useState<{ token?: string; amount: number; provider: string } | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const providers = BILL_PROVIDERS.filter((p) => p.category === activeTab);
  const currentProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];

  const handleMeterVerify = (val: string) => {
    setPhoneOrMeter(val);
    if (val.length >= 10 && activeTab === "ELECTRICITY") {
      setVerifiedCustomerName(t("bills.verifyMeter"));
      setTimeout(() => setVerifiedCustomerName("Ibrahim Dan-Batta · " + t("bills.meterVerified")), 500);
    } else {
      setVerifiedCustomerName(null);
    }
  };

  const handlePayBill = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPinModalOpen(true);
  };

  const handleConfirmPin = async (pin: string) => {
    setIsPinModalOpen(false);
    setIsExecuting(true);
    setExecutionError(null);

    const billAmount =
      activeTab === "DATA"
        ? DATA_PLANS_NG.find((p) => p.id === selectedDataPlan)?.amount || 1200
        : parseFloat(customAmount) || 1000;

    const result = await executeBillPayment({
      billerCategory: activeTab,
      billerProvider: currentProvider?.name || "Utility Provider",
      meterOrPhone: phoneOrMeter,
      amount: billAmount,
      currency: activeWallet.currency,
    });

    setIsExecuting(false);
    if (result.success) {
      setVendedResult({ token: result.token, amount: billAmount, provider: currentProvider?.name || "Utility Provider" });
    } else {
      setExecutionError(result.error || "Payment failed");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("bills.title")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("bills.subtitle")}</p>
        </div>
      </div>

      {/* Bill Category Tabs */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: "AIRTIME", label: t("bills.airtime"), icon: Smartphone },
          { id: "DATA", label: t("bills.data"), icon: Wifi },
          { id: "ELECTRICITY", label: t("bills.electricity"), icon: Flame },
          { id: "CABLE_TV", label: t("bills.cableTv"), icon: Tv },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as typeof activeTab); setVendedResult(null); setExecutionError(null); }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                isSelected
                  ? "bg-[var(--brand-soft)] border-[var(--border-strong)] text-[var(--brand-primary)] font-bold"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] sm:text-xs text-center leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bill Form Card */}
      {vendedResult ? (
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--brand-border)] p-6 sm:p-8 text-center space-y-5 shadow-[var(--shadow-card)] animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight">{t("bills.billPaymentSuccess")}</h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              {t("bills.billPaymentSuccessDesc", { amount: formatMoney(vendedResult.amount, activeWallet.currency), provider: vendedResult.provider })}
            </p>
          </div>

          {vendedResult.token && (
            <div className="p-4 rounded-2xl bg-[var(--warning-soft)] border border-[var(--warning)]/30 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--warning)] font-bold">⚡ {t("bills.prepaidToken")}</span>
              <div className="text-xl font-mono font-extrabold text-[var(--foreground)] select-all">{vendedResult.token}</div>
            </div>
          )}

          <button onClick={() => setVendedResult(null)} className="w-full py-3.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]">
            {t("bills.payAnother")}
          </button>
        </div>
      ) : (
        <form onSubmit={handlePayBill} className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
          {/* Select Provider */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{activeTab === "ELECTRICITY" ? t("bills.selectDisco") : t("bills.selectNetwork")}</label>
            <select value={selectedProviderId} onChange={(e) => setSelectedProviderId(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-xs font-medium focus:outline-none">
              {providers.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.country === "NG" ? "🇳🇬 Nigeria" : "🇳🇪 Niger"})</option>))}
            </select>
          </div>

          {/* Identifier */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{activeTab === "ELECTRICITY" || activeTab === "CABLE_TV" ? t("bills.meterNumber") : t("bills.phoneAirtime")}</label>
            <input type="text" required placeholder={activeTab === "ELECTRICITY" ? "e.g. 45029104910" : "+234 803 456 7890"}
              value={phoneOrMeter} onChange={(e) => handleMeterVerify(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-mono text-sm placeholder:text-[var(--text-disabled)] focus:outline-none" />
            {verifiedCustomerName && (
              <div className="p-2.5 rounded-xl bg-[var(--success-soft)] border border-[var(--success-soft)] text-[11px] text-[var(--success)] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /><span>{verifiedCustomerName}</span>
              </div>
            )}
          </div>

          {/* If Data: Plan Selector */}
          {activeTab === "DATA" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">{t("bills.selectPackage")}</label>
              <select value={selectedDataPlan} onChange={(e) => setSelectedDataPlan(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] text-xs font-medium focus:outline-none">
                {DATA_PLANS_NG.map((plan) => (<option key={plan.id} value={plan.id}>{plan.name} — ₦{plan.amount.toLocaleString()}</option>))}
              </select>
            </div>
          )}

          {/* If Airtime / Electricity: Amount Quick Presets & Input */}
          {activeTab !== "DATA" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--foreground)]">{t("common.amount")} ({activeWallet.currency})</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {["500", "1000", "2000", "5000", "10000"].map((preset) => (
                  <button key={preset} type="button" onClick={() => setCustomAmount(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 transition-colors ${
                      customAmount === preset ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:bg-[var(--surface)]"
                    }`}>
                    {activeWallet.currency === "NGN" ? "₦" : "CFA "}{parseInt(preset).toLocaleString()}
                  </button>
                ))}
              </div>
              <input type="number" min="100" required value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-mono text-base font-bold placeholder:text-[var(--text-disabled)] focus:outline-none" />
            </div>
          )}

          {executionError && (
            <div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-xs text-[var(--danger)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{executionError}</span>
            </div>
          )}

          <button type="submit" disabled={isExecuting || !phoneOrMeter}
            className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-extrabold text-sm transition-all shadow-[var(--shadow-md)] disabled:opacity-50">
            {t("bills.payBillBtn")}
          </button>
        </form>
      )}

      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={handleConfirmPin} />
    </div>
  );
}
