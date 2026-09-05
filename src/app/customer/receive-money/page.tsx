"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import CustomerProfileGate from "@/components/customer/ui/CustomerProfileGate";
import { ArrowLeft, Copy, Check, Share2, Zap } from "lucide-react";

export default function ReceiveMoneyPage() {
  const { customer, wallets, t } = useCustomer();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (wallet: (typeof wallets)[0]) => {
    const text = `${t("customer.receive.logoAddress")}\n${t("dashboard.availableBalance")}: ${wallet.bankName}\n${t("customer.receive.accountNumber")}: ${wallet.accountNumber}\n${t("customer.accounts.accountName")}: ${wallet.accountName}\n${t("customer.accounts.accountType")}: ${wallet.currency}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "KoriePay", text });
      } catch {
        handleCopy(wallet.accountNumber, wallet.id);
      }
    } else {
      handleCopy(wallet.accountNumber, wallet.id);
    }
  };

  if (!customer) {
    return (
      <CustomerProfileGate labelKey="common.loading">
        {null}
      </CustomerProfileGate>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            {t("receive.title")}
          </h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("receive.subtitle")}</p>
        </div>
      </div>

      {/* QR Code Presentation Card */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 text-center space-y-4 shadow-[var(--shadow-card)]">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--brand-primary)] font-bold">
            {t("receive.qrTitle")}
          </span>
          <p className="text-xs text-[var(--foreground-muted)]">{t("receive.qrSubtitle")}</p>
        </div>

        {/* Dynamic Stylized QR Code (decorative pattern, no fake data) */}
        <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto shadow-[var(--shadow-md)] flex flex-col items-center justify-center relative">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[var(--brand-deep)]">
            <rect x="5" y="5" width="30" height="30" rx="4" fill="currentColor" />
            <rect x="10" y="10" width="20" height="20" rx="2" fill="white" />
            <rect x="15" y="15" width="10" height="10" fill="currentColor" />
            <rect x="65" y="5" width="30" height="30" rx="4" fill="currentColor" />
            <rect x="70" y="10" width="20" height="20" rx="2" fill="white" />
            <rect x="75" y="15" width="10" height="10" fill="currentColor" />
            <rect x="5" y="65" width="30" height="30" rx="4" fill="currentColor" />
            <rect x="10" y="70" width="20" height="20" rx="2" fill="white" />
            <rect x="15" y="75" width="10" height="10" fill="currentColor" />
            <rect x="42" y="10" width="16" height="8" fill="currentColor" />
            <rect x="42" y="24" width="8" height="18" fill="currentColor" />
            <rect x="54" y="24" width="6" height="8" fill="currentColor" />
            <rect x="10" y="42" width="18" height="8" fill="currentColor" />
            <rect x="35" y="45" width="30" height="10" rx="2" fill="var(--brand-primary)" />
            <rect x="75" y="42" width="15" height="18" fill="currentColor" />
            <rect x="42" y="62" width="18" height="12" fill="currentColor" />
            <rect x="65" y="65" width="10" height="25" fill="currentColor" />
            <rect x="80" y="75" width="15" height="15" fill="currentColor" />
          </svg>
        </div>

        <div className="text-xs font-bold text-[var(--foreground)] font-mono">
          @{customer.email.split("@")[0]} · KoriePay
        </div>
      </div>

      {/* Multi-Currency Account List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[var(--foreground)] uppercase font-mono tracking-wider">
          {t("customer.receive.dedicatedNumbers")}
        </h2>

        {wallets.map((w) => (
          <div
            key={w.id}
            className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs">
                  {w.currency === "NGN" ? "₦" : w.currency === "XOF" ? "CFA" : "$"}
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--foreground)]">{w.bankName}</div>
                  <div className="text-[10px] text-[var(--foreground-muted)]">{w.currency} {t("customer.accounts.accountType")}</div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--success-soft)] text-[var(--success)]">
                ● {t("customer.receive.active247")}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-mono text-[var(--foreground-muted)]">
                  {t("customer.receive.accountNumber")}
                </div>
                <div className="text-base sm:text-lg font-extrabold text-[var(--foreground)] font-mono tracking-wider">
                  {w.accountNumber}
                </div>
                <div className="text-[11px] text-[var(--foreground-muted)] truncate">{w.accountName}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(w.accountNumber, w.id)}
                  className="p-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                  title={t("customer.receive.copyingAria")}
                >
                  {copiedId === w.id ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleShare(w)}
                  className="p-2.5 rounded-xl bg-[var(--brand-soft)] hover:bg-[var(--brand-soft-strong)] text-[var(--brand-primary)] transition-colors"
                  title={t("customer.receive.shareDetails")}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Instant Settlement Note */}
      <div className="p-4 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-xs text-[var(--brand-deep)] flex items-center gap-3">
        <Zap className="w-5 h-5 text-[var(--brand-primary)] shrink-0" />
        <span>{t("receive.instantCreditNote")}</span>
      </div>
    </div>
  );
}
