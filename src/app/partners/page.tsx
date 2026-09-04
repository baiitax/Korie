"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "@/components/ui/CountryContext";
import {
  Building2,
  Repeat2,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Globe2,
  Handshake,
  Sparkles,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function PartnersPage() {
  const { openModal } = useCountry();

  const partnerTypes = [
    {
      title: "Commercial & Regional Banks",
      desc: "Integrate your core banking system directly with KoriePay's agency distribution network to expand retail deposits without capital-heavy branch construction.",
      badge: "Banking Desks",
      icon: <Building2 className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: "Bureau De Change Associations",
      desc: "Empower your registered member operators with digitized treasury rails, automated compliance logging, and real-time cross-border settlement corridors.",
      badge: "FX Operators",
      icon: <Repeat2 className="w-5 h-5 text-amber-400" />,
    },
    {
      title: "Fintechs & Payment Aggregators",
      desc: "Route high-volume cross-border payments between Nigeria and Niger Republic through our low-latency bilateral clearing APIs.",
      badge: "API Integrators",
      icon: <Globe2 className="w-5 h-5 text-teal-400" />,
    },
    {
      title: "Super-Agents & Commercial Distributors",
      desc: "Deploy thousands of KoriePay smart POS terminals across state and regional retail distribution networks with attractive revenue-sharing models.",
      badge: "Super Agents",
      icon: <Users className="w-5 h-5 text-blue-400" />,
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-mono mb-4">
            <Handshake className="w-3.5 h-3.5" />
            <span>STRATEGIC INSTITUTIONAL ALLIANCES</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Build the Future of African Financial Connectivity{" "}
            <span className="text-gradient-gold">With KoriePay</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
            We collaborate with commercial banks, licensed FX associations, regional fintechs, and distribution aggregators to unlock frictionless commerce across West Africa.
          </p>

          <div className="pt-6">
            <button
              onClick={() => openModal("contact", "Institutional Partnership")}
              className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
            >
              <span>Become a Strategic Partner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Partner Pillars */}
      <section className="py-16 kp-band-brand-tint relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {partnerTypes.map((p, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl glass-02 border border-[var(--border-strong)] hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-white/5">{p.icon}</div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10">
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">{p.desc}</p>
                </div>

                <button
                  onClick={() => openModal("contact", p.title)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
                >
                  <span>Initiate Partnership Inquiry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
