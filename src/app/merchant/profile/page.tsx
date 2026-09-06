"use client";

import React from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  Building2,
  ShieldCheck,
  FileCheck,
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
            {merchant.kybStatus === "VERIFIED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
                <span>KYB VERIFIED</span>
              </span>
            ) : merchant.kybStatus === "REJECTED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldCheck className="w-4 h-4" />
                <span>KYB REJECTED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-4 h-4" />
                <span>KYB PENDING REVIEW</span>
              </span>
            )}
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
            {merchant.registeredAddress ? (
              <>
                <div className="font-bold text-white text-sm">{merchant.registeredAddress}</div>
                <div className="text-slate-400">
                  {[merchant.registeredCity, merchant.registeredState].filter(Boolean).join(", ") || (merchant.country === "NE" ? "Niger Republic" : "Nigeria")}
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-sm italic">Not yet on file — contact support to update.</div>
            )}
          </div>
        </div>
      </div>

      {/* KYB Documentation Status */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
        <h3 className="font-bold text-white text-base">Business Verification Status</h3>
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex items-center gap-3">
          <FileCheck className={`w-5 h-5 shrink-0 ${merchant.kybStatus === "VERIFIED" ? "text-emerald-400" : merchant.kybStatus === "REJECTED" ? "text-red-400" : "text-amber-400"}`} />
          <div>
            <div className="font-bold text-xs text-white">
              {merchant.kybStatus === "VERIFIED"
                ? "Your business is fully verified"
                : merchant.kybStatus === "REJECTED"
                ? "Your business KYB was rejected"
                : "Your business KYB is under manual review"}
            </div>
            <div className="text-[10px] text-slate-400">
              {merchant.kybStatus === "VERIFIED"
                ? "Full transaction limits apply based on your tier."
                : "Some features remain limited until this completes."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
