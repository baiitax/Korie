"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import CustomerProfileGate from "@/components/customer/ui/CustomerProfileGate";
import { ArrowLeft, ShieldCheck, Globe, Lock, LogOut, ChevronRight, Phone, Mail } from "lucide-react";

export default function CustomerProfilePage() {
  const { customer, t } = useCustomer();

  if (!customer) {
    return (
      <CustomerProfileGate labelKey="common.loading">
        {null}
      </CustomerProfileGate>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
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
            {t("nav.profile")}
          </h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("customer.profile.subtitle")}</p>
        </div>
      </div>

      {/* Profile Card Hero */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 flex flex-col sm:flex-row items-center gap-5 shadow-[var(--shadow-card)]">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-accent)] text-white flex items-center justify-center text-2xl font-black font-mono shadow-[var(--shadow-md)]">
          {customer.firstName[0]}
          {customer.lastName[0]}
        </div>

        <div className="text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--foreground)]">
              {customer.fullName}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] font-mono font-bold text-[10px] border border-[var(--brand-border)]">
              ● {customer.kycTier}
            </span>
          </div>
          <p className="text-xs text-[var(--foreground-muted)] font-mono flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</span>
            <span className="text-[var(--muted)]">•</span>
            <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>
          </p>
          <div className="text-[11px] text-[var(--brand-primary)] font-semibold pt-1">
            {t("customer.profile.registered")}: {new Date(customer.registeredAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Verified Identifiers */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3 shadow-[var(--shadow-card)] text-xs">
        <h3 className="font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider text-[11px]">
          {t("customer.profile.govVerified")}
        </h3>

        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--foreground-muted)]">{t("customer.profile.bvn")}</span>
            <span className="font-mono font-bold text-[var(--foreground)]">{customer.bvnMasked}</span>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--foreground-muted)]">{t("customer.profile.nin")}</span>
            <span className="font-mono font-bold text-[var(--foreground)]">{customer.ninMasked}</span>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--foreground-muted)]">{t("customer.profile.jurisdiction")}</span>
            <span className="font-mono font-bold text-[var(--foreground)] text-right">
              {customer.country === "NG" ? "🇳🇬 Nigeria" : "🇳🇪 Niger Republic"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="space-y-2">
        <Link href="/customer/kyc" className="p-4 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between transition-colors text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[var(--brand-primary)]" />
            <span className="font-bold text-[var(--foreground)]">{t("customer.profile.kycUpgrade")}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />
        </Link>

        <Link href="/customer/security" className="p-4 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between transition-colors text-xs">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[var(--info)]" />
            <span className="font-bold text-[var(--foreground)]">{t("customer.profile.securitySession")}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />
        </Link>

        <Link href="/customer/settings" className="p-4 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-between transition-colors text-xs">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[var(--brand-accent)]" />
            <span className="font-bold text-[var(--foreground)]">{t("customer.profile.langSettings")}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />
        </Link>
      </div>

      {/* Log Out Button */}
      <Link
        href="/login"
        className="w-full p-4 rounded-2xl bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)]/70 border border-[var(--danger)]/30 text-[var(--danger)] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>{t("common.logout")}</span>
      </Link>
    </div>
  );
}
