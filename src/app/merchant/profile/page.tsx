"use client";

import React from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Building2,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

export default function MerchantProfilePage() {
  const { merchant, t } = useMerchant();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Corporate Profile</h1>
        <p className="text-xs text-slate-400">
          Statutory incorporation records, Tier-3 KYC verification, and linked banking settlement routes.
        </p>
      </div>

      {/* Main Profile Info */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              S
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{merchant.businessName}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Trading as {merchant.tradingName}</span>
                <span>•</span>
                <span className="font-mono text-teal-400">{merchant.merchantCode}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span>KYC TIER-3 VERIFIED</span>
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">CAC Incorporation Number</div>
            <div className="font-mono font-bold text-white text-sm">{merchant.cacNumber}</div>
            <div className="text-slate-500">Corporate Affairs Commission (Nigeria)</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Tax Identification Number (TIN)</div>
            <div className="font-mono font-bold text-white text-sm">{merchant.tinNumber}</div>
            <div className="text-slate-500">Federal Inland Revenue Service (FIRS)</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Primary Email & Contact</div>
            <div className="font-bold text-white text-sm">{merchant.email}</div>
            <div className="text-slate-400 font-mono">{merchant.phone}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Registered Headquarters</div>
            <div className="font-bold text-white text-sm">Plot 1044 Victoria Island</div>
            <div className="text-slate-400">Lagos State, Nigeria</div>
          </div>
        </div>
      </div>

      {/* Compliance Badges */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base">Regulatory & Payment Certifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-white">CBN Tier-1 Approval</div>
              <div className="text-[10px] text-slate-400">Central Bank of Nigeria PSP</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-white">PCI-DSS Level 1</div>
              <div className="text-[10px] text-slate-400">Cardholder Vault Certified</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-white">BCEAO UEMOA Gateway</div>
              <div className="text-[10px] text-slate-400">Francophone West Africa Node</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
