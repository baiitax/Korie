"use client";

import React from "react";
import Link from "next/link";
import { useCountry } from "@/components/ui/CountryContext";
import {
  Globe2,
  Building2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  MapPin,
  Coins,
} from "lucide-react";
import CTASection from "@/components/sections/CTASection";

export default function NigerRepublicPage() {
  const { openModal } = useCountry();

  const nigerHubs = [
    {
      city: "Niamey National Capital",
      focus: "Institutional & Corporate Treasury",
      desc: "Clearing desk for multinational importers, commercial banks, and institutional trade finance.",
    },
    {
      city: "Maradi Commercial Heart",
      focus: "Agricultural Trading & Grain Rails",
      desc: "Direct bilateral settlement point with Kano for sesame, groundnut, and livestock trading.",
    },
    {
      city: "Zinder & Diffa Regional Hubs",
      focus: "Cross-Border Agency & Retail Terminals",
      desc: "Enabling local merchants and shopkeepers to accept digital payments and provide cash access.",
    },
    {
      city: "Tahoua & Agadez Trade Corridors",
      focus: "Transit & Mining Commerce Logistics",
      desc: "Fast digital settlements for freight logistics, transport operators, and regional distributors.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-4">
              <span>🇳🇪 NIGER REPUBLIC MARKET INFRASTRUCTURE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Modern Financial Rails for the{" "}
              <span className="text-gradient-gold">Republic of Niger & WAEMU</span>
            </h1>

            <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
              Serving Niamey, Maradi, Zinder, and cross-border commercial hubs. KoriePay empowers agency networks, FX operators, and merchants with West African CFA Franc (XOF) digital settlement and direct Nigerian Naira interoperability.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-6">
              <button
                onClick={() => openModal("bdc")}
                className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
              >
                <span>Partner in Niger Republic</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/solutions/payments"
                className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors"
              >
                View Cross-Border Corridors
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Hubs */}
      <section className="py-20 kp-band-brand-tint relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Strategic Trading Centers in Niger Republic
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Connecting Francophone West African trade routes directly to regional digital liquidity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nigerHubs.map((hub, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl glass-02 border border-[var(--border-strong)] hover:border-amber-500/40 transition-all flex items-start gap-4"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 shrink-0">
                  <MapPin className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{hub.city}</h3>
                  <div className="text-xs font-semibold text-amber-400 mb-2">{hub.focus}</div>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{hub.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
