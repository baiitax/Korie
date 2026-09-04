"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCountry } from "../ui/CountryContext";
import {
  ArrowRight,
  ShieldCheck,
  Building2,
  Repeat2,
  Users,
  Briefcase,
  CheckCircle2,
  Globe2,
  TrendingUp,
  Zap,
} from "lucide-react";
import Image from "next/image";

export const HeroSection: React.FC = () => {
  const { openModal, country } = useCountry();
  const [activeSegment, setActiveSegment] = useState<"agents" | "bdc" | "customers" | "business">("agents");

  const segmentContent = {
    agents: {
      badge: "Last-Mile Financial Infrastructure",
      title: "Empowering Over 50,000+ Physical Service Points",
      desc: "Transform your store or kiosk into a fully enabled banking agency point. Provide cash-in, cash-out, interbank transfers, and utility payments with reliable terminal hardware and instant commissions.",
      cta: "Become a KoriePay Agent",
      action: () => openModal("agent"),
      metric: "Instant Commission Settlement",
    },
    bdc: {
      badge: "Digital FX & Treasury Rails",
      title: "Modern Liquidity for Licensed FX Operators",
      desc: "Connect your Bureau De Change directly to institutional cross-border liquidity. Manage customer transactions, rate transparency, multi-currency balances, and automated settlement between Nigeria and Niger.",
      cta: "Partner as BDC Operator",
      action: () => openModal("bdc"),
      metric: "Sub-Second FX Corridor Routing",
    },
    customers: {
      badge: "Consumer Financial Freedom",
      title: "Your Money, Connected Across Borders",
      desc: "Experience instant transfers, frictionless bill payments, dynamic merchant QR checkout, and cross-border remittances. As our Hausa slogan says: Kudinka, Hannunka — Your money, in your hands.",
      cta: "Open an Account",
      action: () => openModal("contact", "Customer Wallet"),
      metric: "Zero Latency Domestic & Regional Rails",
    },
    business: {
      badge: "Enterprise & SME Treasury",
      title: "High-Throughput Payments for Scaled Commerce",
      desc: "Empower your enterprise with multi-currency accounts, automated bulk payroll, merchant payment links, and institutional developer APIs engineered for 99.98% reliability.",
      cta: "Build With KoriePay",
      action: () => openModal("business"),
      metric: "Enterprise SLA & Dedicated Desk",
    },
  };

  const activeData = segmentContent[activeSegment];

  return (
    <section className="relative pt-32 pb-20 lg:pt-36 lg:pb-28 overflow-hidden bg-[#0a0f1d] bg-grid-subtle">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-brand-teal-500/15 via-brand-yellow-500/10 to-brand-orange-500/15 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Corridor Pill Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-white/15 text-xs font-medium text-slate-300 shadow-xl backdrop-blur-md">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold font-mono">🇳🇬 NIGERIA</span>
            <span className="text-slate-500">↔</span>
            <span className="text-amber-400 font-bold font-mono">🇳🇪 NIGER REPUBLIC</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline text-[11px]">
              One Unified Financial Infrastructure
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto mb-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
            Powering the Financial Ecosystem Across{" "}
            <span className="text-gradient-korie">Nigeria & Niger Republic</span>
          </h1>
          <p className="mt-5 text-sm sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            KoriePay connects <strong className="text-white font-semibold">customers</strong>,{" "}
            <strong className="text-emerald-400 font-semibold">agency banking networks</strong>,{" "}
            <strong className="text-amber-400 font-semibold">BDC/FX operators</strong>, and{" "}
            <strong className="text-white font-semibold">businesses</strong> through secure, scalable digital financial infrastructure built for the next generation of African commerce.
          </p>
        </div>

        {/* Audience Segment Switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setActiveSegment("agents")}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSegment === "agents"
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>For Agents</span>
            </button>

            <button
              onClick={() => setActiveSegment("bdc")}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSegment === "bdc"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Repeat2 className="w-3.5 h-3.5" />
              <span>For BDCs / FX</span>
            </button>

            <button
              onClick={() => setActiveSegment("customers")}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSegment === "customers"
                  ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>For Customers</span>
            </button>

            <button
              onClick={() => setActiveSegment("business")}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSegment === "business"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">For Businesses</span>
              <span className="sm:hidden">Business</span>
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Segment Hero Box */}
        <div className="max-w-5xl mx-auto mb-12 p-6 sm:p-8 rounded-3xl bg-[#0d162a]/80 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle accent corner glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-emerald-400 border border-white/10">
                  {activeData.badge}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-amber-400" /> {activeData.metric}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-snug">
                {activeData.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeData.desc}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={activeData.action}
                  className="px-5 py-2.5 rounded-xl btn-korie-primary text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-[1.02] transition-transform"
                >
                  <span>{activeData.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href={
                    activeSegment === "agents"
                      ? "/solutions/agency-banking"
                      : activeSegment === "bdc"
                      ? "/solutions/bdc-fx"
                      : activeSegment === "customers"
                      ? "/solutions/customers"
                      : "/solutions/business"
                  }
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5"
                >
                  <span>Explore Architecture</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Visual Node / Terminal Card preview */}
            <div className="lg:col-span-5">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-3">
                {/* Visual Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-mono text-slate-300">
                      LIVE INFRASTRUCTURE NODE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">99.98% SLA</span>
                </div>

                {/* Micro transaction simulator card */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Cross-Border Corridor</span>
                    <span className="text-emerald-400 font-mono font-bold">Kano ↔ Maradi</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Settlement Currency</span>
                    <span className="text-white font-mono">NGN ₦ ⇄ XOF CFA</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Latency & Verification</span>
                    <span className="text-amber-400 font-mono">&lt; 420ms (Instant)</span>
                  </div>
                </div>

                {/* Capability checks */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Agent Ledger</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>BDC Settlement</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>NDPR Compliant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>WAEMU Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Ecosystem Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">2 Markets</div>
            <div className="text-xs text-slate-400 mt-1">Nigeria 🇳🇬 & Niger Republic 🇳🇪</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">3 Core Pillars</div>
            <div className="text-xs text-slate-400 mt-1">Agency, BDC/FX & Customers</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-teal-400 font-mono">&lt; 650ms</div>
            <div className="text-xs text-slate-400 mt-1">Sub-second Cross-Border Routing</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">99.98%</div>
            <div className="text-xs text-slate-400 mt-1">Core Infrastructure Uptime SLA</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
