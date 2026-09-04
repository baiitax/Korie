"use client";

import React from "react";
import { useCountry } from "../ui/CountryContext";
import {
  ArrowRight,
  Building2,
  Repeat2,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

export const CTASection: React.FC = () => {
  const { openModal } = useCountry();

  return (
    <section className="py-20 lg:py-28 relative bg-[#060a14] overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-brand-mesh opacity-60 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-8 sm:p-12 lg:p-16 rounded-3xl bg-gradient-to-b from-[#0e172e] to-[#080d1a] border border-white/15 shadow-2xl relative overflow-hidden text-center max-w-5xl mx-auto">
          {/* Subtle logo background watermark */}
          <div className="absolute -top-16 -right-16 w-80 h-80 opacity-5 pointer-events-none">
            <Image
              src="/brand/koriepay-icon-tight.png"
              alt="KoriePay"
              width={320}
              height={320}
              className="object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>CONNECT WITH KORIEPAY INFRASTRUCTURE</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto mb-4">
            Ready to Connect to the Future of Cross-Border African Finance?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Whether you run a community agency kiosk, a high-volume Bureau De Change, a fast-growing merchant business, or an institutional banking desk — KoriePay provides the unified technology layer.
          </p>

          {/* Audience Conversion Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8">
            <button
              onClick={() => openModal("agent")}
              className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/50 hover:bg-slate-850 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                Become an Agent
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                POS terminals & cash points
              </div>
            </button>

            <button
              onClick={() => openModal("bdc")}
              className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-amber-500/50 hover:bg-slate-850 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Repeat2 className="w-5 h-5 text-amber-400" />
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300">
                Partner as BDC
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                FX treasury & settlements
              </div>
            </button>

            <button
              onClick={() => openModal("merchant")}
              className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-teal-500/50 hover:bg-slate-850 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-teal-400" />
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-teal-300">
                Accept Payments
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Merchant QR & checkout links
              </div>
            </button>

            <button
              onClick={() => openModal("developer")}
              className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-blue-500/50 hover:bg-slate-850 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-blue-300">
                Developer Sandbox
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                APIs, SDKs & Webhooks
              </div>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instant Verification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Dedicated Account Manager</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Bilateral Regulatory Alignment</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
