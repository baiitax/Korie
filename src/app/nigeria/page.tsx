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

export default function NigeriaPage() {
  const { openModal } = useCountry();

  const nigeriaHubs = [
    {
      city: "Kano Commercial Hub",
      focus: "Grain, Wholesale & Sahel Trade",
      desc: "Direct integration with Dawanau Market and major wholesale distributors feeding cross-border trade into Niger.",
    },
    {
      city: "Lagos Financial Center",
      focus: "Institutional Corporate & E-Commerce",
      desc: "High-throughput API connections to major commercial banks, fintech switches, and national clearing houses.",
    },
    {
      city: "Abuja HQ & Central Region",
      focus: "Regulatory & Enterprise Clearing",
      desc: "Centralized corporate treasury desk and regulatory compliance operations.",
    },
    {
      city: "Katsina & Sokoto Border Corridors",
      focus: "Last-Mile Agency & BDC Desks",
      desc: "Frontline agency banking terminals and licensed BDC partner desks facilitating daily cross-border border trade.",
    },
  ];

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-4">
              <span>🇳🇬 NIGERIA MARKET INFRASTRUCTURE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Powering Financial Access Across{" "}
              <span className="text-gradient-green">All 36 States + FCT</span>
            </h1>

            <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
              Nigeria is Africa&apos;s largest economy. KoriePay delivers reliable transaction routing, NIP interbank settlement, agency banking networks, and bilateral cross-border liquidity to Nigerian businesses and consumers.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-6">
              <button
                onClick={() => openModal("agent")}
                className="px-6 py-3 rounded-xl btn-korie-primary text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
              >
                <span>Become an Agent in Nigeria</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/solutions/bdc-fx"
                className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-white/10 transition-colors"
              >
                Explore BDC Desks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Hubs */}
      <section className="py-20 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Strategic Regional Hubs & Trading Corridors
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              Connecting rural agency outposts to urban financial centers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nigeriaHubs.map((hub, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-[#0b1324] border border-white/10 hover:border-emerald-500/40 transition-all flex items-start gap-4"
              >
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 shrink-0">
                  <MapPin className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{hub.city}</h3>
                  <div className="text-xs font-semibold text-emerald-400 mb-2">{hub.focus}</div>
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
