"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "@/components/ui/CountryContext";
import {
  Building2,
  Smartphone,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Zap,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import AgentCalculator from "@/components/sections/AgentCalculator";
import CTASection from "@/components/sections/CTASection";

export default function AgencyBankingPage() {
  const { openModal } = useCountry();

  const features = [
    {
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      title: "Agent Digital Wallet",
      desc: "Segregated, secure agent treasury wallet with real-time balance updates, instant float replenishment, and zero settlement delays.",
    },
    {
      icon: <CreditCard className="w-5 h-5 text-amber-400" />,
      title: "Smart POS & Android Terminal",
      desc: "High-speed 4G/WiFi hybrid terminals supporting chip, PIN, contactless NFC, and instant receipt printing with long-lasting battery life.",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-teal-400" />,
      title: "Real-Time Commission Ledger",
      desc: "Every transaction automatically credits your commission balance instantly. No end-of-month reconciliation waiting periods.",
    },
    {
      icon: <Layers className="w-5 h-5 text-blue-400" />,
      title: "Cash-In & Cash-Out Network",
      desc: "Deliver cash deposits, cash withdrawals, and interbank transfers to any commercial bank in Nigeria (via NIBSS/NIP) or Niger Republic (via WAEMU).",
    },
    {
      icon: <Clock className="w-5 h-5 text-purple-400" />,
      title: "Bill Payments & Airtime Hub",
      desc: "Single-tap electricity token vending, cable TV subscriptions, data top-ups, and regional utility collections with lucrative margins.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      title: "Defensive Risk & Fraud Telemetry",
      desc: "Automated PIN security, biometric cashier logins, and geographic velocity safeguards protect your agency funds from malicious tampering.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <Building2 className="w-3.5 h-3.5" />
                <span>LAST-MILE FINANCIAL INFRASTRUCTURE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Powering the Next Generation of{" "}
                <span className="text-gradient-korie">Agency Banking</span>
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Equip your retail shop, supermarket, pharmacy, or financial kiosk with Tier-1 terminal technology. Deliver vital cash-in, cash-out, interbank transfers, and utility services to your community with instant commission settlement.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => openModal("agent")}
                  className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                >
                  <span>Become a KoriePay Agent</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#calculator"
                  className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors"
                >
                  Calculate Earnings
                </a>
              </div>
            </div>

            {/* Visual Workflow Card */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-[#0d162a] border border-white/15 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                    Agency Workflow Architecture
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Sub-Second Rails</span>
                </div>

                {/* Step 1 */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    1
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">Customer Requests Service</div>
                    <div className="text-slate-400 text-[11px]">Cash-in, withdrawal, transfer, or bill payment</div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    2
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">Agent POS / App Initiates</div>
                    <div className="text-slate-400 text-[11px]">Biometric or Card PIN verification</div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    3
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">KoriePay Core Engine Routes</div>
                    <div className="text-slate-400 text-[11px]">Direct NIBSS / WAEMU interbank settlement</div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    4
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">Instant Commission Settled</div>
                    <div className="text-emerald-400 text-[11px]">Real-time commission credited to Agent Wallet</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Engineered for Maximum Agent Uptime & High Margins
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Everything an agent needs to run a profitable and secure financial outpost.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-emerald-500/40 transition-all"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 w-fit mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Calculator Section */}
      <section id="calculator" className="py-20 bg-[#080d1a] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AgentCalculator />
        </div>
      </section>

      <CTASection />
    </main>
  );
}
