"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Globe,
  Lock,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  Building2,
} from "lucide-react";

export default function CustomerProfilePage() {
  const { customer, language, t } = useCustomer();

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
            {t("nav.profile")}
          </h1>
          <p className="text-xs text-slate-400">
            Personal identity and verified digital banking credentials.
          </p>
        </div>
      </div>

      {/* Profile Card Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c162c] to-[#070e1b] border border-white/15 p-6 flex flex-col sm:flex-row items-center gap-5 shadow-2xl">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center text-2xl font-black font-mono shadow-xl shadow-emerald-500/20">
          {customer.firstName[0]}
          {customer.lastName[0]}
        </div>

        <div className="text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              {customer.fullName}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/30">
              ● {customer.kycTier}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            {customer.email} • {customer.phone}
          </p>
          <div className="text-[11px] text-emerald-400 font-semibold pt-1">
            Registered: {new Date(customer.registeredAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Verified Identifiers */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-3 shadow-xl text-xs">
        <h3 className="font-mono uppercase font-bold text-slate-400 tracking-wider text-[11px]">
          Government Verified Identifiers
        </h3>

        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Bank Verification (BVN)</span>
            <span className="font-mono font-bold text-emerald-400">{customer.bvnMasked}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">National Identity (NIN / CNI)</span>
            <span className="font-mono font-bold text-emerald-400">{customer.ninMasked}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Market Jurisdiction</span>
            <span className="font-mono font-bold text-white">
              {customer.country === "NG" ? "🇳🇬 Nigeria (CBN Supervised)" : "🇳🇪 Niger Republic (BCEAO)"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="space-y-2">
        <Link
          href="/customer/kyc"
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between transition-colors text-xs"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white">Account Limits & KYC Upgrade</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/customer/security"
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between transition-colors text-xs"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-white">Security & Active Sessions</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/customer/settings"
          className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between transition-colors text-xs"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-teal-400" />
            <span className="font-bold text-white">Language & Notification Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Log Out Button */}
      <Link
        href="/login"
        className="w-full p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>{t("common.logout")}</span>
      </Link>
    </div>
  );
}
