"use client";

import React, { useState } from "react";
import { useCountry } from "../ui/CountryContext";
import {
  Globe2,
  ArrowRightLeft,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

export const CrossBorderCorridor: React.FC = () => {
  const { openModal } = useCountry();
  const [selectedCorridor, setSelectedCorridor] = useState<number>(0);

  const corridors = [
    {
      id: "kano-maradi",
      title: "Kano 🇳🇬 ⇄ Maradi 🇳🇪",
      subtitle: "The Premier Sahel Grain & Wholesale Trade Axis",
      distance: "Approx. 240 km",
      settlementTime: "< 3 Seconds",
      currencies: "NGN ₦ ⇄ XOF CFA",
      description:
        "The historic commerce pipeline connecting Dawanau Grain Market in Kano with the agricultural trading hubs of Maradi and Central Niger. KoriePay replaces dangerous physical cash haulage with instant digital merchant settlements.",
      keyFlows: ["Agricultural Wholesale", "Manufactured Goods", "Cross-Border Livestock", "Merchant Deposits"],
    },
    {
      id: "katsina-danissa",
      title: "Katsina 🇳🇬 ⇄ Dan-Issa / Maradi 🇳🇪",
      subtitle: "High-Volume Border Commerce Corridor",
      distance: "Approx. 45 km",
      settlementTime: "< 2 Seconds",
      currencies: "NGN ₦ ⇄ XOF CFA",
      description:
        "A critical trade gateway where thousands of daily cross-border traders, truck drivers, and exchange operators settle transactions. KoriePay POS terminals allow border merchants to accept both NGN and CFA instantly.",
      keyFlows: ["Daily SME Border Trade", "Freight & Logistics Clearing", "Agency Cash Points", "Instant FX Swaps"],
    },
    {
      id: "sokoto-birni",
      title: "Sokoto / Illela 🇳🇬 ⇄ Birni N'Konni 🇳🇪",
      subtitle: "North-Western Economic & Energy Gateway",
      distance: "Approx. 95 km",
      settlementTime: "< 3 Seconds",
      currencies: "NGN ₦ ⇄ XOF CFA",
      description:
        "Connecting Sokoto Caliphate commercial markets with Tahoua and Birni N'Konni in Niger. Facilitates seamless financial clearing for energy, livestock, textile imports, and cross-border family remittances.",
      keyFlows: ["Textile Distribution", "Livestock Clearing", "P2P Remittances", "BDC Treasury Reserves"],
    },
    {
      id: "lagos-niamey",
      title: "Lagos / Abuja 🇳🇬 ⇄ Niamey 🇳🇪",
      subtitle: "Capital & Institutional Corporate Corridor",
      distance: "Commercial Air & Sea Rail",
      settlementTime: "Real-Time Gross Rail",
      currencies: "NGN ₦ ⇄ XOF CFA / USD",
      description:
        "Institutional corporate corridor for multinational manufacturers, distributors, banks, and authorized BDC houses conducting high-value treasury allocations between Nigeria's commercial capital and Niger's national capital.",
      keyFlows: ["Enterprise Invoicing", "Commercial Bank Settlements", "Multilateral FX Clearing", "Institutional APIs"],
    },
  ];

  const active = corridors[selectedCorridor];

  return (
    <section className="py-20 lg:py-28 relative bg-[#090f1f] text-white overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-xs font-mono text-emerald-400 mb-3">
            <Globe2 className="w-3.5 h-3.5" />
            <span>BILATERAL ECONOMIC RAILS</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            One Financial Technology Platform. <br className="hidden sm:inline" />
            <span className="text-gradient-korie">Two Interconnected Markets.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Nigeria and Niger Republic share more than 1,500 kilometers of contiguous border, deep cultural heritage, and billions of dollars in bilateral annual commerce. KoriePay provides the unified digital financial bridge.
          </p>
        </div>

        {/* Interactive Corridor Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Corridor Selectors */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1 mb-2">
              Select Strategic Commercial Axis:
            </div>
            {corridors.map((c, index) => (
              <button
                key={c.id}
                onClick={() => setSelectedCorridor(index)}
                className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                  selectedCorridor === index
                    ? "bg-gradient-to-r from-emerald-950/70 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-300"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{c.title}</span>
                    {selectedCorridor === index && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/20 text-emerald-400 rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{c.subtitle}</div>
                </div>
                <ArrowRightLeft
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    selectedCorridor === index ? "text-emerald-400 scale-110" : "text-slate-500"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Right: Corridor Map & Detail Display Card */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0d162a] border border-white/10 shadow-2xl relative overflow-hidden">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                    CORRIDOR TELEMETRY & CLEARING
                  </span>
                  <h3 className="text-lg sm:text-2xl font-bold text-white mt-0.5">
                    {active.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                    {active.currencies}
                  </span>
                </div>
              </div>

              {/* Map Illustration / Visual Pulse */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 mb-6 relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  {/* Nigeria Node */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-xl shadow-lg">
                      🇳🇬
                    </div>
                    <span className="text-xs font-bold text-white mt-1">Nigeria</span>
                    <span className="text-[10px] font-mono text-slate-400">NGN ₦ Rails</span>
                  </div>

                  {/* Flow Animation Line */}
                  <div className="flex-1 px-4 flex flex-col items-center">
                    <div className="w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 rounded-full relative">
                      <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#10b981] absolute -top-1 animate-pulse left-1/2 -translate-x-1/2" />
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] font-mono text-emerald-400">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Settlement Speed: {active.settlementTime}</span>
                    </div>
                  </div>

                  {/* Niger Node */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xl shadow-lg">
                      🇳🇪
                    </div>
                    <span className="text-xs font-bold text-white mt-1">Niger Rep.</span>
                    <span className="text-[10px] font-mono text-slate-400">XOF CFA Rails</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                {active.description}
              </p>

              {/* Key Flow Tags */}
              <div className="mb-6">
                <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
                  Key Economic Sectors Supported:
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.keyFlows.map((flow, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-200"
                    >
                      ✓ {flow}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Licensed financial partner settlement networks</span>
                </div>
                <button
                  onClick={() => openModal("bdc")}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl btn-korie-primary text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Connect Your Liquidity</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CrossBorderCorridor;
