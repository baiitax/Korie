"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "@/components/ui/CountryContext";
import {
  Repeat2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Globe2,
  Lock,
  Zap,
  BarChart3,
  Layers,
  Coins,
} from "lucide-react";
import FxRateSimulator from "@/components/sections/FxRateSimulator";
import CTASection from "@/components/sections/CTASection";

export default function BdcFxPage() {
  const { openModal } = useCountry();

  const bdcCapabilities = [
    {
      icon: <BarChart3 className="w-5 h-5 text-amber-400" />,
      title: "Real-Time Rate & Spread Management",
      desc: "Configure proprietary buy/sell spreads across currency pairs (NGN, XOF CFA, USD) with instant push updates to your cashier terminals and digital customers.",
    },
    {
      icon: <Globe2 className="w-5 h-5 text-emerald-400" />,
      title: "Bilateral Corridor Settlement",
      desc: "Direct digital settlement clearing between Kano, Lagos, Abuja, Maradi, and Niamey without risky physical bulk currency transit.",
    },
    {
      icon: <Layers className="w-5 h-5 text-teal-400" />,
      title: "Multi-Currency Virtual Accounts",
      desc: "Provision dedicated virtual accounts for institutional clients to deposit local currency and receive automated foreign exchange allocation.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
      title: "Automated AML & Compliance Logs",
      desc: "Integrated KYC capture, threshold monitoring, and daily electronic reporting to keep your Bureau De Change compliant with Central Bank directives.",
    },
    {
      icon: <Coins className="w-5 h-5 text-yellow-400" />,
      title: "Treasury Liquidity Dashboard",
      desc: "Gain birds-eye visibility over multi-branch float balances, pending cross-border batch orders, and realized FX revenue margins.",
    },
    {
      icon: <Lock className="w-5 h-5 text-purple-400" />,
      title: "Institutional Double-Signatory Approvals",
      desc: "Enforce multi-user verification on high-value currency disbursements, preventing internal unauthorized fund movements.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
                <Repeat2 className="w-3.5 h-3.5" />
                <span>FX INFRASTRUCTURE & TREASURY</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Digital Infrastructure for{" "}
                <span className="text-gradient-gold">Modern FX & BDC Businesses</span>
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Transform your Bureau De Change or foreign exchange desk into a modern digital powerhouse. KoriePay provides the institutional software and bilateral settlement rails connecting Nigeria and Niger Republic.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => openModal("bdc")}
                  className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                >
                  <span>Partner With KoriePay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#simulator"
                  className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors"
                >
                  Test Rate Simulator
                </a>
              </div>
            </div>

            {/* Visual BDC Metric Box */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-[#0d162a] border border-white/15 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                    BDC Treasury Control Center
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Connected</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Active Corridors:</span>
                    <span className="text-white font-mono font-bold">NGN ⇄ XOF CFA / USD</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Settlement Architecture:</span>
                    <span className="text-emerald-400 font-mono font-bold">Bilateral Real-Time Gross</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">AML Risk Profiling:</span>
                    <span className="text-amber-400 font-mono font-bold">Automated Central Bank Aligned</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed italic">
                  * Note: KoriePay provides financial technology software and settlement gateway services in compliance with licensed regulatory partner frameworks.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Smarter, Safer & Faster Currency Operations
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Eliminate reconciliation errors, physical risk, and fragmented messaging apps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bdcCapabilities.map((cap, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-amber-500/40 transition-all"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 w-fit mb-4">
                  {cap.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{cap.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FX Simulator */}
      <section id="simulator" className="py-20 bg-[#080d1a] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FxRateSimulator />
        </div>
      </section>

      <CTASection />
    </main>
  );
}
