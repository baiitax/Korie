"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Upload,
  FileCheck2,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function CustomerKycPage() {
  const { customer, t } = useCustomer();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUploadSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
    }, 1200);
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
            {t("kyc.title")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("kyc.subtitle")}
          </p>
        </div>
      </div>

      {/* Current Tier Badge Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950/40 via-[#0b162c] to-[#070e1b] border border-emerald-500/30 p-6 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
            {t("kyc.currentTier")}
          </span>
          <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
            ● {customer.kycStatus}
          </span>
        </div>

        <div className="text-2xl font-extrabold text-white">
          {customer.kycTier} — Verified Individual
        </div>

        <p className="text-xs text-slate-300">
          Your account is fully authorized for daily transactions up to ₦5,000,000 / 5,000,000 CFA.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="text-[10px] text-slate-400">Daily Transfer Limit</div>
            <div className="font-bold text-white mt-0.5">₦5,000,000</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="text-[10px] text-slate-400">Maximum Balance</div>
            <div className="font-bold text-emerald-400 mt-0.5">UNLIMITED</div>
          </div>
        </div>
      </div>

      {/* Tier Breakdown Roadmap */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
          Account Verification Tiers
        </h2>

        {/* Tier 1 */}
        <div className="p-4 rounded-2xl bg-[#090f1e] border border-white/5 flex items-center justify-between opacity-80">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">Tier 1 — Basic Retail</div>
              <div className="text-[11px] text-slate-400 font-mono">₦50,000 / 50,000 CFA Daily</div>
            </div>
          </div>
          <span className="text-xs text-emerald-400 font-bold font-mono">Completed</span>
        </div>

        {/* Tier 2 (Current) */}
        <div className="p-4 rounded-2xl bg-[#0b172e] border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">Tier 2 — Verified Individual</div>
              <div className="text-[11px] text-emerald-300 font-mono">₦5,000,000 / 5,000,000 CFA Daily</div>
            </div>
          </div>
          <span className="text-xs text-emerald-400 font-bold font-mono">Active</span>
        </div>

        {/* Tier 3 */}
        <div className="p-4 rounded-2xl bg-[#090f1e] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-xs font-bold text-white">Tier 3 — Corporate & Unlimited</div>
              <div className="text-[11px] text-slate-400 font-mono">Unlimited Cross-Border Volume</div>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">Available</span>
        </div>
      </div>

      {/* Document Upload for Tier 3 */}
      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>Upgrade to Tier 3 (Corporate / BDC)</span>
        </div>

        <p className="text-xs text-slate-400">
          Upload your Corporate Affairs Commission (CAC) filing or RCCM registration to unlock unlimited daily volume.
        </p>

        {uploadSuccess ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-300 space-y-1">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400" />
            <div className="font-bold">Documents Submitted Successfully</div>
            <p className="text-[11px] text-slate-400">
              Our compliance team will review and update your tier within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUploadSimulate} className="space-y-3">
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center space-y-2 hover:border-emerald-500/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-300 font-semibold">
                Click or drag CAC / RCCM certificate here
              </div>
              <p className="text-[10px] text-slate-500">PDF, JPG, PNG (Max 10MB)</p>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              {isUploading ? "Uploading..." : t("kyc.uploadDocument")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
