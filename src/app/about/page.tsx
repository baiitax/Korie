"use client";

import React from "react";
import {
  Target,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function AboutPage() {
  const milestones = [
    {
      year: "The Vision",
      title: "Recognizing the Sahel Trade Friction",
      desc: "Billions in bilateral trade between Northern Nigeria and Niger Republic moved via risky physical cash haulage. The founders envisioned a unified digital settlement railway.",
    },
    {
      year: "Infrastructure Core",
      title: "Building the Multi-Currency Engine",
      desc: "Engineered sub-second cross-border routing capable of handling simultaneous NGN ₦ and XOF CFA settlements with automated compliance telemetry.",
    },
    {
      year: "Last-Mile Rollout",
      title: "Scaling Agency Banking & BDC Desks",
      desc: "Equipping retail agents and licensed Bureau De Change operators with smart terminals and real-time liquidity management tools.",
    },
    {
      year: "Pan-African Expansion",
      title: "Regional Financial Connectivity",
      desc: "Deepening connectivity between WAEMU trade zones and Anglophone financial hubs to accelerate true cross-border financial inclusion.",
    },
  ];

  const leadership = [
    {
      name: "Executive Leadership Team",
      role: "Fintech Architects & Banking Veterans",
      bio: "Comprising seasoned digital banking executives, payments engineers, and regulatory compliance specialists with decades of combined experience across West African central banking jurisdictions.",
    },
    {
      name: "Engineering & Security Division",
      role: "Infrastructure & Cryptography Specialists",
      bio: "Distributed engineering team located in Abuja, Lagos, and Niamey maintaining 99.98% transaction reliability, double-entry ledgers, and zero-trust perimeter defense.",
    },
    {
      name: "Regional Agency & Market Operations",
      role: "Field Network & Liquidity Desks",
      bio: "Dedicated on-the-ground support teams actively managing liquidity, agent training, and BDC operator relationships in Kano, Maradi, Katsina, Sokoto, and Niamey.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-brand-mesh opacity-40 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block mb-3">
              Corporate Narrative
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Building the Financial Infrastructure Connecting{" "}
              <span className="text-gradient-korie">West African Commerce</span>
            </h1>
            <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
              KoriePay was founded with a singular purpose: to replace fragmented, fragile payment channels with modern, institutional-grade financial infrastructure that connects people, agency networks, FX operators, and enterprises across Nigeria and Niger Republic.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision Grid */}
      <section className="py-16 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-[#0b1324] border border-white/10 shadow-xl space-y-4 relative overflow-hidden">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Our Mission</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                To build accessible, secure, and scalable financial technology infrastructure that eliminates the barriers to cross-border commerce, empowers local agents at the last mile, and bridges liquidity for businesses across West Africa.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0b1324] border border-white/10 shadow-xl space-y-4 relative overflow-hidden">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Our Vision</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                To become the definitive digital financial foundation for West Africa—where money moves as seamlessly across national borders and languages as trade itself. Kudinka, Hannunka (Your Money, in Your Hands).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Strategic Story Narrative */}
      <section className="py-20 relative bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              The KoriePay Journey
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
              From Fragmented Cash to Unified Digital Rails
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              Understanding why KoriePay exists and how our infrastructure transforms daily commerce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0d162a] border border-white/10 relative flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-emerald-400 font-bold mb-2">{m.year}</div>
                  <h3 className="text-base font-bold text-white mb-2">{m.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Strategic Milestone</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership & Regional Presence */}
      <section className="py-20 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Institutional Governance & Regional Teams
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              Operating with full physical and regulatory presence across our core markets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {leadership.map((item, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-emerald-500/30 transition-all"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 w-fit mb-4">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{item.name}</h3>
                <div className="text-xs font-semibold text-emerald-400 mb-3">{item.role}</div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <CTASection />
    </main>
  );
}
